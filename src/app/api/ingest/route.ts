import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@/lib/crawler';
import { chunkText } from '@/lib/chunk';
import { embedBatch } from '@/lib/embeddings';
import { query } from '@/lib/db';
import { canAddSite } from '@/lib/usage';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { webhookEvents } from '@/lib/webhooks';
import { logEvent } from '@/lib/events';
import { CrawlTrackingService } from '@/lib/crawl-tracking';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const tenantId = await getTenantIdStrict();
    const input = body?.input;
    const siteId = body?.siteId;

    if (!tenantId || !input) {
        return NextResponse.json({ error: 'tenantId and input required' }, { status: 400 });
    }

    // Validate siteId if provided
    if (siteId) {
        try {
            const siteCheck = await query(
                'SELECT id FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
                [siteId, tenantId]
            );

            if (siteCheck.rowCount === 0) {
                return NextResponse.json({ error: 'Invalid siteId for this tenant' }, { status: 400 });
            }
        } catch (error) {
            console.error('Site validation error:', error);
            return NextResponse.json({ error: 'Failed to validate site' }, { status: 500 });
        }
    }

    try {
        const u = new URL(input);
        const gate = await canAddSite(tenantId, u.host);
        if (!gate.ok) {
            const pr = await query<{ plan: string }>('select plan from public.tenants where id=$1', [tenantId]);
            const plan = pr.rows[0]?.plan || 'starter';
            return NextResponse.json({ error: gate.reason, details: { host: gate.host, current: gate.current, limit: gate.limit, plan } }, { status: 402 });
        }
    } catch { }

    // Log ingest start
    logEvent({ tenantId, name: 'ingest_started', data: { input, siteId }, soft: true });

    // Start crawl attempt tracking
    const crawlAttemptId = await CrawlTrackingService.startCrawlAttempt({
        tenantId,
        siteId,
        sourceUrl: input,
        sourceType: input.includes('sitemap') ? 'sitemap' : 'url',
        maxRetries: 3
    });

    const startTime = Date.now();
    let docs = [] as Awaited<ReturnType<typeof crawl>>;
    let totalBytesProcessed = 0;
    try {
        docs = await crawl(input);
    } catch (err) {
        const error = err as Error;

        // Record crawl failure
        await CrawlTrackingService.completeCrawlAttempt(crawlAttemptId, {
            status: 'failed',
            durationMs: Date.now() - startTime,
            errorType: error.message.includes('401') || error.message.includes('403') ? 'auth' :
                error.message.includes('409') ? 'conflict' :
                    error.message.includes('timeout') ? 'timeout' : 'network',
            errorMessage: error.message,
            errorDetails: { stack: error.stack },
            canRetry: true
        });

        // Log ingest failure event then return
        logEvent({ tenantId, name: 'ingest_failed', data: { input, siteId, error: error.message?.slice(0, 200) }, soft: true });
        return NextResponse.json({ error: 'ingest_failed', message: error.message }, { status: 500 });
    }
    // Normalize and dedupe by URL per tenant
    const seen = new Set<string>();
    let documentsProcessed = 0;
    let pagesSkipped = 0;
    let pagesFailed = 0;

    for (const d of docs) {
        if (!d.content || d.content.trim().length === 0 || /No content extracted from this page$/i.test(d.content)) {
            console.warn(`Skipping empty/sparse document: ${d.url}`);
            pagesSkipped++;
            continue;
        }
        const normUrl = (() => { try { const u = new URL(d.url); u.hash = ''; return u.toString(); } catch { return d.url; } })();
        if (seen.has(normUrl)) {
            pagesSkipped++;
            continue;
        }
        seen.add(normUrl);

        try {
            // Skip if already ingested for this tenant (and site if specified)
            let existing;
            if (siteId) {
                existing = await query<{ id: string }>(
                    `SELECT id FROM public.documents WHERE tenant_id=$1 AND url=$2 AND site_id=$3 LIMIT 1`,
                    [tenantId, normUrl, siteId]
                );
            } else {
                existing = await query<{ id: string }>(
                    `SELECT id FROM public.documents WHERE tenant_id=$1 AND url=$2 AND site_id IS NULL LIMIT 1`,
                    [tenantId, normUrl]
                );
            }

            if (existing.rows[0]?.id) {
                pagesSkipped++;
                continue;
            }

            // Insert document with site_id
            const ins = await query<{ id: string }>(
                `INSERT INTO public.documents (tenant_id, url, title, content, site_id)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                [tenantId, normUrl, d.title, d.content, siteId || null]
            );

            const docId = ins.rows[0].id;
            const chunks = chunkText(d.content);
            totalBytesProcessed += d.content.length;

            // Filter chunks to match what embedBatch will process
            const validChunks = chunks.filter(chunk => chunk && chunk.trim().length > 0);

            if (validChunks.length === 0) {
                console.warn(`No valid chunks for document: ${normUrl}`);
                pagesSkipped++;
                continue;
            }

            const embs = await embedBatch(validChunks);

            for (let i = 0; i < validChunks.length; i++) {
                const v = `[${embs[i].join(',')}]`;
                await query(
                    `INSERT INTO public.chunks (tenant_id, document_id, url, content, token_count, embedding, site_id)
                     VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
                    [tenantId, docId, normUrl, validChunks[i], Math.ceil(validChunks[i].length / 4), v, siteId || null]
                );
            }

            // Trigger document ingested webhook
            try {
                await webhookEvents.documentIngested(tenantId, docId, normUrl, validChunks.length);
            } catch (error) {
                console.error('Failed to trigger document.ingested webhook:', error);
            }

            documentsProcessed++;
        } catch (pageError) {
            console.error(`Failed to process page ${normUrl}:`, pageError);
            pagesFailed++;

            // Record page failure
            await CrawlTrackingService.recordPageFailure({
                crawlAttemptId,
                tenantId,
                pageUrl: normUrl,
                pageTitle: d.title,
                errorType: 'parsing',
                errorMessage: pageError instanceof Error ? pageError.message : 'Unknown processing error',
                errorDetails: { stack: pageError instanceof Error ? pageError.stack : undefined }
            });
        }
    }

    // Complete crawl attempt tracking
    await CrawlTrackingService.completeCrawlAttempt(crawlAttemptId, {
        status: pagesFailed > 0 && documentsProcessed === 0 ? 'failed' : 'success',
        pagesFound: docs.length,
        pagesCrawled: documentsProcessed,
        pagesFailed,
        pagesSkipped,
        durationMs: Date.now() - startTime,
        bytesProcessed: totalBytesProcessed
    });

    // Log ingest completion summary
    logEvent({ tenantId, name: 'ingest_completed', data: { input, siteId, docs: docs.length }, soft: true });
    return NextResponse.json({
        ok: true,
        docs: docs.length,
        processed: documentsProcessed,
        failed: pagesFailed,
        skipped: pagesSkipped,
        crawlAttemptId
    });
}

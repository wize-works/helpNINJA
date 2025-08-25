import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@/lib/crawler';
import { chunkText } from '@/lib/chunk';
import { embedBatch } from '@/lib/embeddings';
import { query } from '@/lib/db';
import { canAddSite } from '@/lib/usage';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { webhookEvents } from '@/lib/webhooks';

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

    const docs = await crawl(input);
    // Normalize and dedupe by URL per tenant
    const seen = new Set<string>();
    for (const d of docs) {
        if (!d.content || d.content.trim().length === 0 || /No content extracted from this page$/i.test(d.content)) {
            console.warn(`Skipping empty/sparse document: ${d.url}`);
            continue;
        }
        const normUrl = (() => { try { const u = new URL(d.url); u.hash = ''; return u.toString(); } catch { return d.url; } })();
        if (seen.has(normUrl)) continue; seen.add(normUrl);
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

        if (existing.rows[0]?.id) continue;

        // Insert document with site_id
        const ins = await query<{ id: string }>(
            `INSERT INTO public.documents (tenant_id, url, title, content, site_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [tenantId, normUrl, d.title, d.content, siteId || null]
        );

        const docId = ins.rows[0].id;
        const chunks = chunkText(d.content);

        // Filter chunks to match what embedBatch will process
        const validChunks = chunks.filter(chunk => chunk && chunk.trim().length > 0);

        if (validChunks.length === 0) {
            console.warn(`No valid chunks for document: ${normUrl}`);
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
    }
    return NextResponse.json({ ok: true, docs: docs.length });
}

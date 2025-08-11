import { NextRequest, NextResponse } from 'next/server';
import { crawl } from '@/lib/crawler';
import { chunkText } from '@/lib/chunk';
import { embedBatch } from '@/lib/embeddings';
import { query } from '@/lib/db';
import { canAddSite } from '@/lib/usage';
import { resolveTenantIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const tenantId = body?.tenantId || await resolveTenantIdFromRequest(req, true);
    const input = body?.input;
    if (!tenantId || !input) return NextResponse.json({ error: 'tenantId and input required' }, { status: 400 });

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
        const normUrl = (() => { try { const u = new URL(d.url); u.hash = ''; return u.toString(); } catch { return d.url; } })();
        if (seen.has(normUrl)) continue; seen.add(normUrl);
        // Skip if already ingested for this tenant
        const existing = await query<{ id: string }>(`select id from public.documents where tenant_id=$1 and url=$2 limit 1`, [tenantId, normUrl]);
        if (existing.rows[0]?.id) continue;
        const ins = await query<{ id: string }>(
            `insert into public.documents (tenant_id, url, title, content)
       values ($1,$2,$3,$4) returning id`, [tenantId, normUrl, d.title, d.content]
        );
        const docId = ins.rows[0].id;
        const chunks = chunkText(d.content);
        const embs = await embedBatch(chunks);
        for (let i = 0; i < chunks.length; i++) {
            const v = `[${embs[i].join(',')}]`;
            await query(
                `insert into public.chunks (tenant_id, document_id, url, content, token_count, embedding)
         values ($1,$2,$3,$4,$5,$6::vector)`, [tenantId, docId, normUrl, chunks[i], Math.ceil(chunks[i].length / 4), v]
            );
        }
    }
    return NextResponse.json({ ok: true, docs: docs.length });
}

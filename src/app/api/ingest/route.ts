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
        if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402 });
    } catch { }

    const docs = await crawl(input);
    for (const d of docs) {
        const ins = await query<{ id: string }>(
            `insert into public.documents (tenant_id, url, title, content)
       values ($1,$2,$3,$4) returning id`, [tenantId, d.url, d.title, d.content]
        );
        const docId = ins.rows[0].id;
        const chunks = chunkText(d.content);
        const embs = await embedBatch(chunks);
        for (let i = 0; i < chunks.length; i++) {
            await query(
                `insert into public.chunks (tenant_id, document_id, url, content, token_count, embedding)
         values ($1,$2,$3,$4,$5,$6)`, [tenantId, docId, d.url, chunks[i], Math.ceil(chunks[i].length / 4), embs[i]]
            );
        }
    }
    return NextResponse.json({ ok: true, docs: docs.length });
}

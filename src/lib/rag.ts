import { query } from './db';
import { embedQuery } from './embeddings';

export type HybridResult = { id?: string; document_id?: string; url: string; title?: string; content: string }

export async function searchHybrid(tenantId: string, q: string, k = 8): Promise<HybridResult[]> {
    const { rows: lex } = await query<{ document_id: string, url: string, title: string, content: string }>(
        `select d.id as document_id, d.url, d.title, d.content
     from public.documents d
     where d.tenant_id = $1 and d.tsv @@ plainto_tsquery('english', $2)
     limit 20`, [tenantId, q]
    );

    const qe = await embedQuery(q);
    const { rows: vec } = await query<{ id: string, url: string, content: string }>(
        `select c.id, c.url, c.content
     from public.chunks c
     where c.tenant_id = $1
     order by c.embedding <=> $2::vector
     limit $3`, [tenantId, qe, k]
    );

    const seen = new Set<string>();
    const merged: HybridResult[] = [...vec, ...lex.filter(l => { const u = l.url; if (seen.has(u)) return false; seen.add(u); return true; })];
    return merged.slice(0, k);
}

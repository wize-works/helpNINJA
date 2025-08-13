import { query } from './db';
import { embedQuery } from './embeddings';

export type HybridResult = { id?: string; document_id?: string; url: string; title?: string; content: string }
export type CuratedAnswer = { id: string; question: string; answer: string; priority: number; keywords: string[]; tags: string[] }

export async function searchHybrid(tenantId: string, q: string, k = 8, siteId?: string): Promise<HybridResult[]> {
    // Build site filtering conditions
    let siteFilter = '';
    const params: unknown[] = [tenantId, q];
    
    if (siteId) {
        siteFilter = ' AND (d.site_id = $3 OR d.site_id IS NULL)';
        params.push(siteId);
    }
    
    const { rows: lex } = await query<{ document_id: string, url: string, title: string, content: string }>(
        `select d.id as document_id, d.url, d.title, d.content
         from public.documents d
         where d.tenant_id = $1 and d.tsv @@ plainto_tsquery('english', $2)${siteFilter}
         limit 20`, params
    );

    const qe = await embedQuery(q);
    // Build pgvector literal: [v1,v2,...] to cast as ::vector
    const vecLiteral = `[${qe.join(',')}]`;
    
    // Update vector search to include site filtering
    let chunkSiteFilter = '';
    const chunkParams: unknown[] = [tenantId, vecLiteral, k];
    
    if (siteId) {
        chunkSiteFilter = ' AND (c.site_id = $4 OR c.site_id IS NULL)';
        chunkParams.push(siteId);
    }
    
    const { rows: vec } = await query<{ id: string, url: string, content: string }>(
        `select c.id, c.url, c.content
         from public.chunks c
         where c.tenant_id = $1${chunkSiteFilter}
         order by c.embedding <=> $2::vector
         limit $3`, chunkParams
    );

    const seen = new Set<string>();
    const merged: HybridResult[] = [...vec, ...lex.filter(l => { const u = l.url; if (seen.has(u)) return false; seen.add(u); return true; })];
    return merged.slice(0, k);
}

/**
 * Search for curated answers that match the user's query
 * These take precedence over regular RAG results
 */
export async function searchCuratedAnswers(tenantId: string, q: string, siteId?: string): Promise<CuratedAnswer[]> {
    let siteFilter = '';
    const params: unknown[] = [tenantId, q, `%${q}%`];
    
    if (siteId) {
        siteFilter = ' AND (a.site_id = $4 OR a.site_id IS NULL)';
        params.push(siteId);
    }
    
    let orderByClause = '';
    if (siteId) {
        orderByClause = `ORDER BY 
           CASE WHEN a.site_id = $4 THEN 1 ELSE 2 END,
           a.priority DESC,
           ts_rank(a.question_tsv, plainto_tsquery('english', $2)) DESC`;
    } else {
        orderByClause = `ORDER BY 
           a.priority DESC,
           ts_rank(a.question_tsv, plainto_tsquery('english', $2)) DESC`;
    }
    
    const { rows } = await query<CuratedAnswer>(
        `SELECT a.id, a.question, a.answer, a.priority, a.keywords, a.tags
         FROM public.answers a
         WHERE a.tenant_id = $1 
           AND a.status = 'active'
           AND (
             a.question_tsv @@ plainto_tsquery('english', $2) OR
             a.question ILIKE $3 OR
             a.answer ILIKE $3 OR
             $2 = ANY(a.keywords) OR
             $2 = ANY(a.tags)
           )${siteFilter}
         ${orderByClause}
         LIMIT 3`, params
    );
    
    return rows;
}

/**
 * Enhanced search that prioritizes curated answers over RAG results
 */
export async function searchWithCuratedAnswers(tenantId: string, q: string, k = 8, siteId?: string): Promise<{
    curatedAnswers: CuratedAnswer[];
    ragResults: HybridResult[];
}> {
    // Search for curated answers first
    const curatedAnswers = await searchCuratedAnswers(tenantId, q, siteId);
    
    // Get RAG results (reduce count if we have curated answers)
    const ragK = Math.max(1, k - curatedAnswers.length);
    const ragResults = await searchHybrid(tenantId, q, ragK, siteId);
    
    return {
        curatedAnswers,
        ragResults
    };
}

import { query } from './db';
import { embedQuery } from './embeddings';

export type HybridResult = {
    id?: string;
    document_id?: string;
    url: string;
    title?: string;
    content: string;
    // optional scoring for ranker
    _lexScore?: number;     // ts_rank
    _vecDist?: number;      // pgvector distance (<=>) lower is better
};

export type CuratedAnswer = {
    id: string;
    question: string;
    answer: string;
    priority: number;
    keywords: string[];
    tags: string[];
};

// ----- Intent helpers -------------------------------------------------------

type IntentKey = 'features' | 'pricing' | 'troubleshoot' | 'what_is' | 'integrations' | 'sales' | 'smalltalk' | 'other' | string;

function expandTerms(q: string, intent?: IntentKey): string[] {
    const base = [q];
    if (intent === 'features') return [...base, 'features', 'capabilities', 'what it does', 'benefits', 'why use'];
    if (intent === 'pricing') return [...base, 'pricing', 'price', 'plans', 'trial', 'billing', 'cost'];
    if (intent === 'troubleshoot') return [...base, 'troubleshoot', 'fix', 'how to', 'resolve', 'steps'];
    return base;
}

function buildWebsearchQuery(terms: string[]): string {
    // Join with OR to keep recall high; websearch_to_tsquery handles quoting.
    // Example: "features OR capabilities OR 'what it does'"
    const orExpr = terms
        .map(t => t.trim().includes(' ') ? `"${t.trim()}"` : t.trim())
        .filter(Boolean)
        .join(' OR ');
    return orExpr || '';
}

function pathBoost(url: string, intent?: IntentKey): number {
    // Positive boost scores; higher is better. We later convert vec distance to similarity and add these.
    let s = 0;
    const u = url.toLowerCase();
    const isHome = /^https?:\/\/[^/]+\/?$/.test(u);
    if (isHome) s += 0.10;
    if (/\/docs(\/|$)/.test(u)) s += 0.08;
    if (intent === 'features' && /\/(features|product)(\/|$)/.test(u)) s += 0.25;
    if (intent === 'pricing' && /\/pricing(\/|$)/.test(u)) s += 0.35;
    return s;
}

// Convert pgvector distance (lower is better) to a similarity (higher is better) in a crude but stable way.
function distToSim(d?: number): number {
    if (d == null) return 0;
    // Typical cosine/normalized L2 distances are in [0, ~2]; map to (0,1] monotonically decreasing.
    return 1 / (1 + Math.max(0, d));
}

function rankAndDedupe(results: HybridResult[], k: number, intent?: IntentKey): HybridResult[] {
    interface Scored extends HybridResult { _score: number }
    const byUrl = new Map<string, Scored>();

    for (const r of results) {
        const baseSim = Math.max(r._lexScore ?? 0, distToSim(r._vecDist));
        const score = baseSim + pathBoost(r.url, intent);
        const prev = byUrl.get(r.url);
        if (!prev || score > prev._score) byUrl.set(r.url, { ...r, _score: score });
    }

    return [...byUrl.values()]
        .sort((a, b) => b._score - a._score)
        .slice(0, k)
        .map(sc => { const copy: HybridResult & { _score?: number } = { ...sc }; delete (copy as Record<string, unknown>)._score; return copy; });
}

// ----- Core search ----------------------------------------------------------

export async function searchHybrid(
    tenantId: string,
    q: string,
    k = 8,
    siteId?: string,
    opts?: { intent?: IntentKey }
): Promise<HybridResult[]> {
    const intent = opts?.intent as IntentKey | undefined;
    const terms = expandTerms(q, intent);

    // -------- Lexical (documents) with ts_rank and websearch_to_tsquery
    const webQuery = buildWebsearchQuery(terms);
    const lexParams: unknown[] = [tenantId, webQuery];
    let docSiteFilter = '';
    if (siteId) {
        docSiteFilter = ' AND (d.site_id = $3 OR d.site_id IS NULL)';
        lexParams.push(siteId);
    }

    const lexSql = `
    SELECT
      d.id AS document_id,
      d.url,
      d.title,
      d.content,
      ts_rank(d.tsv, websearch_to_tsquery('english', $2)) AS _lexScore
    FROM public.documents d
    WHERE d.tenant_id = $1
      AND d.tsv @@ websearch_to_tsquery('english', $2)
      ${docSiteFilter}
    ORDER BY _lexScore DESC
    LIMIT ${Math.min(40, Math.max(20, k * 3))}
  `;

    const { rows: lex } = await query<HybridResult & { _lexScore: number }>(lexSql, lexParams);

    // -------- Vector (chunks) using averaged embedding of expanded terms
    // Compute embeddings for each term and average them for a robust query vector.
    const vecs = await Promise.all(terms.map(t => embedQuery(t)));
    const dim = vecs[0]?.length ?? 0;
    const avg: number[] = new Array(dim).fill(0);
    for (const v of vecs) for (let i = 0; i < dim; i++) avg[i] += v[i];
    for (let i = 0; i < dim; i++) avg[i] /= Math.max(1, vecs.length);
    const vecLiteral = `[${avg.join(',')}]`;

    const chunkParams: unknown[] = [tenantId, vecLiteral];
    let chunkSiteFilter = '';
    if (siteId) {
        chunkSiteFilter = ' AND (c.site_id = $3 OR c.site_id IS NULL)';
        chunkParams.push(siteId);
    }

    const vecSql = `
    SELECT
      c.id,
      c.url,
      c.content,
      c.document_id,
      (c.embedding <=> $2::vector) AS _vecDist
    FROM public.chunks c
    WHERE c.tenant_id = $1
      ${chunkSiteFilter}
    ORDER BY _vecDist ASC
    LIMIT ${Math.min(40, Math.max(20, k * 3))}
  `;

    const { rows: vec } = await query<(HybridResult & { _vecDist: number })>(vecSql, chunkParams);

    // -------- Merge + rank + dedupe (intent-aware boosting)
    // Prefer vector for rich snippets, but lexical brings titles; both get normalized via ranker.
    const merged = rankAndDedupe(
        [
            ...vec.map(v => ({ ...v })),                 // has _vecDist
            ...lex.map(l => ({ ...l, _lexScore: normLex(l._lexScore) }))
        ],
        k,
        intent
    );

    return merged;
}

function normLex(rank: number | undefined): number {
    // ts_rank can vary; squash to ~[0,1] for our combined scorer
    if (rank == null) return 0;
    // cheap min-max-ish squashing: treat 0.6+ as "very good"
    return Math.min(1, rank / 0.6);
}

/**
 * Search for curated answers that match the user's query
 * These take precedence over regular RAG results
 */
export async function searchCuratedAnswers(tenantId: string, q: string, siteId?: string, opts?: { intent?: IntentKey }): Promise<CuratedAnswer[]> {
    // intent currently unused; reference to avoid lint complaint
    void opts?.intent;
    // (intent currently unused here; keeping signature for future per-intent boosts)
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
export async function searchWithCuratedAnswers(
    tenantId: string,
    q: string,
    k = 8,
    siteId?: string,
    opts?: { intent?: IntentKey }
): Promise<{
    curatedAnswers: CuratedAnswer[];
    ragResults: HybridResult[];
}> {
    const intent = opts?.intent as IntentKey | undefined;

    // Curated first
    const curatedAnswers = await searchCuratedAnswers(tenantId, q, siteId, { intent });

    // RAG results (reduce count if we have curated answers)
    const ragK = Math.max(1, k - curatedAnswers.length);
    let ragResults = await searchHybrid(tenantId, q, ragK, siteId, { intent });

    // Feature/pricing heuristic fallback ONLY when intent signals it and context is thin
    const needFallback = ragResults.length < Math.max(2, Math.ceil(ragK / 2));
    if (needFallback && (intent === 'features' || intent === 'pricing')) {
        try {
            const params: unknown[] = [tenantId];
            let siteFilter = '';
            if (siteId) {
                siteFilter = ' AND (d.site_id = $2 OR d.site_id IS NULL)';
                params.push(siteId);
            }

            const urlClause =
                intent === 'features'
                    ? `
            d.url ILIKE '%/features%' OR
            d.url ILIKE '%/product%' OR
            d.url ILIKE '%/about%' OR
            d.url ILIKE '%/docs%' OR
            d.url ~ 'https?://[^/]+/?$'
          `
                    : `
            d.url ILIKE '%/pricing%' OR
            d.url ~ 'https?://[^/]+/?$'
          `;

            const marketingSql = `
        SELECT d.id as document_id, d.url, d.title, d.content
        FROM public.documents d
        WHERE d.tenant_id = $1
          ${siteFilter}
          AND ( ${urlClause} )
        ORDER BY
          CASE 
            WHEN d.url ILIKE '%/features%' THEN 1
            WHEN d.url ILIKE '%/product%'  THEN 2
            WHEN d.url ILIKE '%/pricing%'  THEN 1
            WHEN d.url ILIKE '%/about%'    THEN 3
            WHEN d.url ILIKE '%/docs%'     THEN 4
            ELSE 5
          END,
          length(d.content) DESC
        LIMIT 6
      `;

            const { rows } = await query<{ document_id: string, url: string, title: string, content: string }>(marketingSql, params);
            const existing = new Set(ragResults.map(r => r.url));
            for (const r of rows) {
                if (!existing.has(r.url)) {
                    ragResults.push({ document_id: r.document_id, url: r.url, title: r.title, content: r.content });
                }
            }
            // Rank again with boosts and trim to ragK
            ragResults = rankAndDedupe(ragResults, ragK, intent);
        } catch (e) {
            console.warn('Intent fallback fetch failed:', e);
        }
    }

    return { curatedAnswers, ragResults };
}

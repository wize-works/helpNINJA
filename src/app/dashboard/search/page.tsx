import { searchWithCuratedAnswers } from "@/lib/rag";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import SearchResultsViewer from "@/components/search-results-viewer";
import { AnimatedPage, StaggerChild, StaggerContainer } from "@/components/ui/animated-page";
import { Breadcrumb } from "@/components/ui/breadcrumb";

export const runtime = 'nodejs'

export default async function GlobalSearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q.trim() : '';
    const k = Math.min(12, Math.max(1, Number(params.k ?? 8)));
    const siteId = typeof params.site === 'string' ? params.site : undefined;
    const tenantId = await getTenantIdStrict();

    let curatedAnswers: Awaited<ReturnType<typeof searchWithCuratedAnswers>>["curatedAnswers"] = [];
    let ragResults: Awaited<ReturnType<typeof searchWithCuratedAnswers>>["ragResults"] = [];
    let conversations: Array<{
        id: string;
        session_id: string;
        last_message_at: string;
        message_snippet: string | null;
        site_domain: string | null;
        has_human: boolean;
        has_ai: boolean;
        escalated: boolean;
        low_confidence: boolean;
        shared: boolean;
        pending_escalation: boolean;
        has_contact: boolean;
        status: string | null;
    }> = [];
    let feedback: Array<{
        id: string;
        title: string;
        description: string;
        url: string | null;
        type: string;
        status: string;
        priority: string;
        created_at: string;
        site_domain: string | null;
    }> = [];
    if (q) {
        const res = await searchWithCuratedAnswers(tenantId, q, k, siteId);
        curatedAnswers = res.curatedAnswers;
        ragResults = res.ragResults;
        // Find conversations where session_id matches or any user message contains q
        const convRows = await query<{
            id: string;
            session_id: string;
            last_message_at: string;
            message_snippet: string | null;
            site_domain: string | null;
            has_human: boolean;
            has_ai: boolean;
            escalated: boolean;
            low_confidence: boolean;
            shared: boolean;
            pending_escalation: boolean;
            has_contact: boolean;
            status: string | null;
        }>(
            `WITH matched_convos AS (
         SELECT DISTINCT c.id
         FROM public.conversations c
         LEFT JOIN public.messages m ON m.conversation_id = c.id AND m.tenant_id = c.tenant_id
         WHERE c.tenant_id = $1
           AND (
             c.session_id ILIKE $2 OR (m.role = 'user' AND m.content ILIKE $2)
           )
         LIMIT 25
       )
             SELECT c.id,
              c.session_id,
              COALESCE(c.updated_at, c.created_at) AS last_message_at,
              (
                SELECT SUBSTRING(m2.content FROM 1 FOR 160)
                FROM public.messages m2
                WHERE m2.conversation_id = c.id AND m2.tenant_id = c.tenant_id AND m2.role = 'user' AND m2.content ILIKE $2
                ORDER BY m2.created_at DESC
                LIMIT 1
              ) AS message_snippet,
                            ts.domain AS site_domain,
                            EXISTS (
                                SELECT 1 FROM public.messages hm
                                WHERE hm.conversation_id = c.id AND hm.tenant_id = c.tenant_id AND hm.is_human_response = true
                            ) AS has_human,
                            EXISTS (
                                SELECT 1 FROM public.messages am
                                WHERE am.conversation_id = c.id AND am.tenant_id = c.tenant_id AND am.role = 'assistant'
                            ) AS has_ai,
                            EXISTS (
                                SELECT 1 FROM public.escalations e
                                WHERE e.conversation_id = c.id AND e.tenant_id = c.tenant_id
                            ) AS escalated,
                            EXISTS (
                                SELECT 1 FROM public.messages lm
                                WHERE lm.conversation_id = c.id AND lm.tenant_id = c.tenant_id AND lm.role = 'assistant' AND coalesce(lm.confidence, 1) < 0.55
                            ) AS low_confidence,
                            EXISTS (
                                SELECT 1 FROM public.conversation_shares cs
                                WHERE cs.conversation_id = c.id AND cs.tenant_id = c.tenant_id AND cs.expires_at > NOW()
                            ) AS shared,
                            EXISTS (
                                SELECT 1 FROM public.pending_escalations pe
                                WHERE pe.conversation_id = c.id
                            ) AS pending_escalation,
                            EXISTS (
                                SELECT 1 FROM public.conversation_contact_info ci
                                WHERE ci.conversation_id = c.id AND ci.tenant_id = c.tenant_id
                            ) AS has_contact,
                            c.status
       FROM public.conversations c
       LEFT JOIN public.tenant_sites ts ON ts.id = c.site_id
       WHERE c.tenant_id = $1 AND c.id IN (SELECT id FROM matched_convos)
       ORDER BY last_message_at DESC
       LIMIT 25`,
            [tenantId, `%${q}%`]
        );
        conversations = convRows.rows;

        // Fetch matching feedback items (full text and fallback ILIKE)
        const params: (string)[] = [tenantId, q, `%${q}%`];
        let siteFilterClause = '';
        if (siteId) {
            params.push(siteId);
            const siteParamIndex = params.length; // will be 4
            siteFilterClause = `AND (c.site_id = $${siteParamIndex})`;
        }
        const fbRows = await query<{
            id: string;
            title: string;
            description: string;
            url: string | null;
            type: string;
            status: string;
            priority: string;
            created_at: string;
            site_domain: string | null;
        }>(
            `SELECT f.id, f.title, f.description, f.url, f.type, f.status, f.priority, f.created_at,
                                            ts.domain AS site_domain
                             FROM public.feedback f
                             LEFT JOIN public.conversations c ON c.id = f.conversation_id AND c.tenant_id = f.tenant_id
                             LEFT JOIN public.tenant_sites ts ON ts.id = c.site_id
                             WHERE f.tenant_id = $1
                                 AND (
                                     f.search_vector @@ websearch_to_tsquery('english', $2)
                                     OR f.title ILIKE $3 OR f.description ILIKE $3
                                 )
                                 ${siteFilterClause}
                             ORDER BY ts_rank(f.search_vector, websearch_to_tsquery('english', $2)) DESC, f.created_at DESC
                             LIMIT 25`,
            params
        );
        feedback = fbRows.rows;
    }

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Search", icon: "fa-magnifying-glass" }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex items-end justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Search</h1>
                                <p className="text-base-content/60 mt-2">Showing results for: <span className="font-medium">{q || '—'}</span></p>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <StaggerChild>
                        <SearchResultsViewer
                            curatedAnswers={curatedAnswers.map(a => ({
                                id: a.id,
                                question: a.question,
                                answer: a.answer,
                                priority: a.priority,
                                keywords: a.keywords,
                                tags: a.tags,
                                confidence: 0.95,
                                source: 'curated'
                            }))}
                            ragResults={ragResults.map((r, i) => ({
                                id: r.id || r.document_id || `doc_${i}`,
                                title: r.title || r.url || 'Document',
                                content: r.content,
                                url: r.url,
                                snippet: r.content.slice(0, 200) + (r.content.length > 200 ? '…' : ''),
                                relevance_score: Math.max(0.1, 0.95 - i * 0.05),
                                source: 'documents'
                            }))}
                            conversations={conversations.map(c => ({
                                id: c.id,
                                sessionId: c.session_id,
                                lastMessageAt: c.last_message_at,
                                siteDomain: c.site_domain || undefined,
                                snippet: c.message_snippet || '',
                                tags: [
                                    c.has_human ? 'human' : undefined,
                                    c.has_ai ? 'ai' : undefined,
                                    c.escalated ? 'escalated' : undefined,
                                    c.low_confidence ? 'low-confidence' : undefined,
                                    c.shared ? 'shared' : undefined,
                                    c.pending_escalation ? 'pending-escalation' : undefined,
                                    c.has_contact ? 'contact' : undefined,
                                    c.status && c.status !== 'active' ? c.status : undefined
                                ].filter(Boolean) as string[]
                            }))}
                            feedback={feedback.map(f => ({
                                id: f.id,
                                title: f.title,
                                url: f.url || undefined,
                                type: f.type,
                                status: f.status,
                                priority: f.priority,
                                createdAt: f.created_at,
                                siteDomain: f.site_domain || undefined,
                                snippet: (f.description || '').slice(0, 220) + ((f.description || '').length > 220 ? '…' : '')
                            }))}
                            query={q}
                        />
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

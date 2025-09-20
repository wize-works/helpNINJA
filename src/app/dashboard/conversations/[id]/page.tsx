import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';
import CopySessionIdButton from '@/components/copy-session-id-button';
import ConversationTranscript from '@/components/conversation-transcript';
import AgentResponseBox from '@/components/agent-response-box';
import ManualEscalationButton from '@/components/manual-escalation-button';
import ShareConversationButton from '@/components/share-conversation-button';
import Link from 'next/link';
import React from 'react';
import { tagClass } from '@/lib/tags';

export const runtime = 'nodejs';

interface Params { id: string }

async function getConversation(tenantId: string, id: string) {
    const convo = await query<{ id: string; session_id: string; created_at: string }>(
        'select id, session_id, created_at from public.conversations where tenant_id=$1 and id=$2 limit 1',
        [tenantId, id]
    );
    const convoRow = convo.rows[0] || null;
    if (!convoRow) return { convo: null, messages: [], total: 0, kpis: null, sources: [] as { url: string; title: string | null }[], escalations: [] as { id: string; reason: string; confidence: number | null; rule_id: string | null; created_at: string }[] };
    // initial messages
    const messages = await query<{
        id: string; role: string; content: string; created_at: string; confidence: number | null; is_human_response: boolean;
    }>(
        `select id, role, content, created_at, confidence, COALESCE(is_human_response, false) as is_human_response
         from public.messages where tenant_id=$1 and conversation_id=$2
         order by created_at asc limit 50`,
        [tenantId, id]
    );
    const total = await query<{ count: number }>('select count(*)::int as count from public.messages where tenant_id=$1 and conversation_id=$2', [tenantId, id]);
    // KPIs (single round trip)
    const kpi = await query<{
        first_ts: string | null;
        last_ts: string | null;
        assistant_msgs: number;
        user_msgs: number;
        avg_conf: number | null;
        low_conf: number;
        escalations: number;
    }>(`select 
          MIN(created_at) as first_ts,
          MAX(created_at) as last_ts,
          COUNT(*) filter (where role='assistant')::int as assistant_msgs,
          COUNT(*) filter (where role='user')::int as user_msgs,
          ROUND(AVG(confidence) filter (where role='assistant')::numeric, 4)::float as avg_conf,
          COUNT(*) filter (where role='assistant' and confidence < 0.55)::int as low_conf,
          (select count(*) from public.escalations e where e.tenant_id=$1 and e.conversation_id=$2)::int as escalations
        from public.messages
        where tenant_id=$1 and conversation_id=$2`, [tenantId, id]);
    // Extract unique source refs from assistant message markdown (simple URL regex)
    const sourceSet = new Set<string>();
    for (const m of messages.rows) {
        if (m.role === 'assistant') {
            const urls = m.content.match(/https?:\/\/[^\s)]+/g);
            urls?.forEach(u => sourceSet.add(u.replace(/[.,)]$/, '')));
        }
    }
    const sources: { url: string; title: string | null }[] = [];
    if (sourceSet.size) {
        // Attempt to map to documents table titles
        const urlList = Array.from(sourceSet).slice(0, 25); // cap
        const docRows = await query<{ url: string; title: string | null }>(
            `select distinct url, title from public.documents where tenant_id=$1 and url = ANY($2)`,
            [tenantId, urlList]
        );
        const titleMap = new Map(docRows.rows.map(r => [r.url, r.title]));
        for (const u of urlList) sources.push({ url: u, title: titleMap.get(u) || null });
    }
    // Escalations for timeline indicators
    const escalations = await query<{
        id: string; reason: string; confidence: number | null; rule_id: string | null; created_at: string;
    }>(`select id, reason, confidence, rule_id, created_at
        from public.escalations where tenant_id=$1 and conversation_id=$2 order by created_at asc`, [tenantId, id]);
    // Tag flags (align with search + list pages)
    const flags = await query<{
        has_human: boolean;
        has_ai: boolean;
        escalated: boolean;
        low_confidence: boolean;
        shared: boolean;
        pending_escalation: boolean;
        has_contact: boolean;
        status: string | null;
    }>(
        `select 
            EXISTS (select 1 from public.messages m where m.tenant_id=$1 and m.conversation_id=$2 and m.is_human_response=true) as has_human,
            EXISTS (select 1 from public.messages m where m.tenant_id=$1 and m.conversation_id=$2 and m.role='assistant') as has_ai,
            EXISTS (select 1 from public.escalations e where e.tenant_id=$1 and e.conversation_id=$2) as escalated,
            EXISTS (select 1 from public.messages m where m.tenant_id=$1 and m.conversation_id=$2 and m.role='assistant' and coalesce(m.confidence,1) < 0.55) as low_confidence,
            EXISTS (select 1 from public.conversation_shares cs where cs.conversation_id=$2 and cs.expires_at > now()) as shared,
            EXISTS (select 1 from public.pending_escalations pe where pe.conversation_id=$2) as pending_escalation,
            EXISTS (select 1 from public.conversation_contact_info ci where ci.tenant_id=$1 and ci.conversation_id=$2) as has_contact,
            (select status from public.conversations where tenant_id=$1 and id=$2) as status
        `,
        [tenantId, id]
    );
    const tagFlags = flags.rows[0] || { has_human: false, has_ai: false, escalated: false, low_confidence: false, shared: false, pending_escalation: false, has_contact: false, status: null };
    return { convo: convoRow, messages: messages.rows, total: total.rows[0]?.count || 0, kpis: kpi.rows[0], sources, escalations: escalations.rows, tagFlags } as const;
}


export default async function ConversationDetailPage({ params }: { params: Promise<Params> }) {
    const { id } = await params;
    const tenantId = await getTenantIdStrict();
    const { convo, messages, total, kpis, sources, escalations, tagFlags } = await getConversation(tenantId, id);

    const breadcrumbItems = [
        { label: 'Dashboard', href: '/dashboard', icon: 'fa-gauge-high' },
        { label: 'Conversations', href: '/dashboard/conversations', icon: 'fa-messages' },
        { label: convo ? convo.session_id.slice(0, 12) + '…' : 'Not found', icon: 'fa-eye' }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-6">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Error State */}
                {!convo && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm p-8 text-center">
                                <div className="w-16 h-16 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <i className="fa-duotone fa-solid fa-triangle-exclamation text-2xl text-warning" />
                                </div>
                                <h2 className="text-xl font-semibold text-base-content mb-2">Conversation not found</h2>
                                <p className="text-base-content/60 mb-6">The conversation you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                                <HoverScale scale={1.02}>
                                    <Link href="/dashboard/conversations" className="btn btn-primary rounded-xl">
                                        <i className="fa-duotone fa-solid fa-arrow-left mr-2" />
                                        Back to Conversations
                                    </Link>
                                </HoverScale>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Header Section */}
                {convo && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-messages text-lg text-primary" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-base-content">
                                                Conversation Details
                                            </h1>
                                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                                                {[
                                                    tagFlags?.has_human ? 'human' : undefined,
                                                    tagFlags?.has_ai ? 'ai' : undefined,
                                                    tagFlags?.escalated ? 'escalated' : undefined,
                                                    tagFlags?.low_confidence ? 'low-confidence' : undefined,
                                                    tagFlags?.shared ? 'shared' : undefined,
                                                    tagFlags?.pending_escalation ? 'pending-escalation' : undefined,
                                                    tagFlags?.has_contact ? 'contact' : undefined,
                                                    tagFlags?.status && tagFlags.status !== 'active' ? tagFlags.status : undefined
                                                ].filter(Boolean).map(tag => (
                                                    <span key={String(tag)} className={`badge ${tagClass(String(tag))} badge-sm capitalize`}>
                                                        {String(tag).replace('-', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-base-content/60">
                                        Session {convo.session_id} • Started {new Date(convo.created_at).toLocaleDateString()}
                                        {kpis?.last_ts && <span> • Last activity {new Date(kpis.last_ts).toLocaleTimeString()}</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <HoverScale scale={1.02}>
                                        <Link href="/dashboard/conversations" className="btn  btn-sm rounded-lg">
                                            <i className="fa-duotone fa-solid fa-arrow-left text-xs" />
                                            Back
                                        </Link>
                                    </HoverScale>
                                    <CopySessionIdButton sessionId={convo.session_id} />
                                    <HoverScale scale={1.02}>
                                        <button className="btn btn-outline btn-sm rounded-lg">
                                            <i className="fa-duotone fa-solid fa-download text-xs" />
                                            Export
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Quick Stats Bar */}
                {convo && kpis && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 border border-base-300/40 rounded-xl p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-message-lines text-xs text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-primary">{total}</div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">Messages</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-user text-xs text-info" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-info">{kpis.user_msgs}</div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">User</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-robot text-xs text-secondary" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-secondary">{kpis.assistant_msgs}</div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">AI</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${kpis.avg_conf && kpis.avg_conf < 0.55 ? 'bg-warning/10' : 'bg-success/10'} rounded-lg flex items-center justify-center`}>
                                            <i className={`fa-duotone fa-solid fa-chart-line text-xs ${kpis.avg_conf && kpis.avg_conf < 0.55 ? 'text-warning' : 'text-success'}`} />
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold ${kpis.avg_conf && kpis.avg_conf < 0.55 ? 'text-warning' : 'text-success'}`}>
                                                {kpis.avg_conf?.toFixed(2) || '—'}
                                            </div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">Confidence</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${kpis.low_conf ? 'bg-warning/10' : 'bg-base-200/60'} rounded-lg flex items-center justify-center`}>
                                            <i className={`fa-duotone fa-solid fa-triangle-exclamation text-xs ${kpis.low_conf ? 'text-warning' : 'text-base-content/40'}`} />
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold ${kpis.low_conf ? 'text-warning' : 'text-base-content/60'}`}>{kpis.low_conf}</div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">Low Conf</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${kpis.escalations ? 'bg-error/10' : 'bg-base-200/60'} rounded-lg flex items-center justify-center`}>
                                            <i className={`fa-duotone fa-solid fa-fire text-xs ${kpis.escalations ? 'text-error' : 'text-base-content/40'}`} />
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold ${kpis.escalations ? 'text-error' : 'text-base-content/60'}`}>{kpis.escalations}</div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">Escalations</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-base-200/60 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-hourglass-half text-xs text-base-content/60" />
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-base-content">
                                                {kpis.first_ts && kpis.last_ts ? humanDuration(kpis.first_ts, kpis.last_ts) : '—'}
                                            </div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">Duration</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 ${sources.length ? 'bg-accent/10' : 'bg-base-200/60'} rounded-lg flex items-center justify-center`}>
                                            <i className={`fa-duotone fa-solid fa-link text-xs ${sources.length ? 'text-accent' : 'text-base-content/40'}`} />
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold ${sources.length ? 'text-accent' : 'text-base-content/60'}`}>{sources.length}</div>
                                            <div className="text-[10px] text-base-content/60 uppercase tracking-wide">Sources</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Main Content - Better Layout */}
                {convo && (
                    <StaggerContainer>
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                            {/* Transcript - Takes majority of space but better proportioned */}
                            <StaggerChild className="xl:col-span-3">
                                <div className="card bg-base-100 rounded-xl shadow-sm border border-base-300/40">
                                    <div className="border-b border-base-300/40 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                    <i className="fa-duotone fa-solid fa-messages text-sm text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base-content">Conversation Transcript</h3>
                                                    <p className="text-xs text-base-content/60">{total} messages • Live updates enabled</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <ConversationTranscript
                                            conversationId={convo.id}
                                            initialMessages={messages}
                                            total={total}
                                            escalations={escalations}
                                        />
                                    </div>
                                </div>
                            </StaggerChild>

                            {/* Sidebar with Agent Response at Top */}
                            <StaggerChild className="xl:col-span-1">
                                <div className="space-y-4 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto ">
                                    {/* Agent Response - MOVED TO TOP OF SIDEBAR */}
                                    <div className="card bg-gradient-to-br from-success/5 to-success/10 rounded-xl shadow-sm border border-success/20">
                                        <div className="border-b border-success/20 p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                                                    <i className="fa-duotone fa-solid fa-reply text-sm text-success" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base-content text-sm">Quick Response</h3>
                                                    <p className="text-xs text-base-content/60">Reply as human agent</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <AgentResponseBox conversationId={convo.id} />
                                        </div>
                                    </div>

                                    {/* Conversation Actions */}
                                    <div className="card bg-base-100 rounded-xl shadow-sm border border-base-300/40">
                                        <div className="border-b border-base-300/40 p-4">
                                            <h3 className="font-semibold text-base-content text-sm">Actions</h3>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            <ManualEscalationButton
                                                conversationId={convo.id}
                                                sessionId={convo.session_id}
                                                userMessage={messages.length > 0 ? messages[messages.length - 1].content : undefined}
                                            />
                                            <ShareConversationButton
                                                conversationId={convo.id}
                                            />
                                        </div>
                                    </div>

                                    {/* Metadata - Condensed */}
                                    <div className="card bg-base-100 rounded-xl shadow-sm border border-base-300/40">
                                        <div className="border-b border-base-300/40 p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-info/10 rounded-md flex items-center justify-center">
                                                    <i className="fa-duotone fa-solid fa-circle-info text-xs text-info" />
                                                </div>
                                                <h3 className="font-semibold text-base-content text-sm">Details</h3>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <dl className="space-y-3">
                                                <div className="flex items-center justify-between text-xs">
                                                    <dt className="text-base-content/60">Session ID</dt>
                                                    <dd className="font-mono text-base-content truncate max-w-[80px]" title={convo.session_id}>
                                                        {convo.session_id.slice(0, 8)}...
                                                    </dd>
                                                </div>
                                                {kpis?.first_ts && (
                                                    <div className="flex items-center justify-between text-xs">
                                                        <dt className="text-base-content/60">Started</dt>
                                                        <dd className="text-base-content">{new Date(kpis.first_ts).toLocaleTimeString()}</dd>
                                                    </div>
                                                )}
                                                {kpis?.last_ts && (
                                                    <div className="flex items-center justify-between text-xs">
                                                        <dt className="text-base-content/60">Last Activity</dt>
                                                        <dd className="text-base-content">{new Date(kpis.last_ts).toLocaleTimeString()}</dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    </div>

                                    {/* Sources - Condensed */}
                                    {sources.length > 0 && (
                                        <div className="card bg-base-100 rounded-xl shadow-sm border border-base-300/40">
                                            <div className="border-b border-base-300/40 p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-accent/10 rounded-md flex items-center justify-center">
                                                        <i className="fa-duotone fa-solid fa-link text-xs text-accent" />
                                                    </div>
                                                    <h3 className="font-semibold text-base-content text-sm">Sources ({sources.length})</h3>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                    {sources.slice(0, 5).map(s => (
                                                        <div key={s.url} className="flex items-center gap-2 p-2 bg-base-200/40 rounded-lg border border-base-300/20 hover:bg-base-200/60 transition-colors">
                                                            <div className="w-4 h-4 bg-accent/20 rounded flex items-center justify-center flex-shrink-0">
                                                                <i className="fa-duotone fa-solid fa-external-link text-[8px] text-accent" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <a
                                                                    className="text-xs font-medium text-base-content hover:text-primary transition-colors truncate block"
                                                                    href={s.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={s.title || s.url}
                                                                >
                                                                    {s.title || new URL(s.url).hostname}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {sources.length > 5 && (
                                                        <div className="text-xs text-base-content/60 text-center py-2">
                                                            +{sources.length - 5} more sources
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </StaggerChild>
                        </div>
                    </StaggerContainer>
                )}
            </div>
        </AnimatedPage>
    );
}

function humanDuration(a: string, b: string): string {
    const start = new Date(a).getTime();
    const end = new Date(b).getTime();
    const diff = Math.max(0, end - start) / 1000;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = Math.floor(diff % 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
}

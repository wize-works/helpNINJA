import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';
import CopySessionIdButton from '@/components/copy-session-id-button';
import ConversationTranscript from '@/components/conversation-transcript';
import Link from 'next/link';
import React from 'react';

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
        id: string; role: string; content: string; created_at: string; confidence: number | null;
    }>(
        `select id, role, content, created_at, confidence
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
    return { convo: convoRow, messages: messages.rows, total: total.rows[0]?.count || 0, kpis: kpi.rows[0], sources, escalations: escalations.rows };
}


export default async function ConversationDetailPage({ params }: { params: Promise<Params> }) {
    const { id } = await params;
    const tenantId = await getTenantIdStrict();
    const { convo, messages, total, kpis, sources, escalations } = await getConversation(tenantId, id);

    const breadcrumbItems = [
        { label: 'Dashboard', href: '/dashboard', icon: 'fa-gauge-high' },
        { label: 'Conversations', href: '/dashboard/conversations', icon: 'fa-messages' },
        { label: convo ? convo.session_id.slice(0, 12) + '…' : 'Not found', icon: 'fa-eye' }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
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
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
                                        <i className="fa-duotone fa-solid fa-messages text-primary" />
                                        Conversation Details
                                        {kpis?.escalations ? (
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-warning/10 text-warning border border-warning/20 shadow-sm">
                                                <i className="fa-duotone fa-solid fa-fire text-xs" />
                                                Escalated
                                            </span>
                                        ) : null}
                                    </h1>
                                    <p className="text-base-content/60 mt-1">
                                        Session {convo.session_id.slice(0, 12)}... • Started {new Date(convo.created_at).toLocaleDateString()}
                                        {kpis?.last_ts && <span> • Last activity {new Date(kpis.last_ts).toLocaleTimeString()}</span>}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <HoverScale scale={1.02}>
                                        <Link href="/dashboard/conversations" className="flex items-center gap-2 px-4 py-2 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-xl text-sm font-medium transition-all duration-200">
                                            <i className="fa-duotone fa-solid fa-arrow-left text-xs" />
                                            Back
                                        </Link>
                                    </HoverScale>
                                    <CopySessionIdButton sessionId={convo.session_id} />
                                    <HoverScale scale={1.02}>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200">
                                            <i className="fa-duotone fa-solid fa-download text-xs" />
                                            Export
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* KPIs Grid */}
                {convo && kpis && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-figure">
                                                <div className="bg-primary/20 rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                    <i className="fa-duotone fa-solid fa-message-lines text-lg text-primary" aria-hidden />
                                                </div>
                                            </div>
                                            <div className="stat-title">Messages</div>
                                            <div className="stat-value text-primary">{total}</div>
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">User Messages</div>
                                            <div className="stat-figure">
                                                <div className="bg-info/20 rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                    <i className="fa-duotone fa-solid fa-user text-lg text-info" aria-hidden />
                                                </div>
                                            </div>
                                            <div className="stat-value text-info">{kpis.user_msgs}</div>
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">Assistant Messages</div>
                                            <div className="stat-figure">
                                                <div className="bg-secondary/20 rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                    <i className="fa-duotone fa-solid fa-robot text-lg text-secondary" aria-hidden />
                                                </div>
                                            </div>
                                            <div className="stat-value text-secondary">{kpis.assistant_msgs}</div>
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">Avg Confidence</div>
                                            <div className="stat-figure">
                                                <div className={`${kpis.avg_conf && kpis.avg_conf < 0.55 ? 'bg-warning/20' : 'bg-success/20'} rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                                    <i className={`fa-duotone fa-solid fa-chart-line text-lg ${kpis.avg_conf && kpis.avg_conf < 0.55 ? 'text-warning' : 'text-success'}`} aria-hidden />
                                                </div>
                                            </div>
                                            <div className={`stat-value ${kpis.avg_conf && kpis.avg_conf < 0.55 ? 'text-warning' : 'text-success'}`}>
                                                {kpis.avg_conf?.toFixed(2) || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">Low Confidence</div>
                                            <div className="stat-figure">
                                                <div className={`${kpis.low_conf ? (kpis.low_conf > 3 ? 'bg-error/20' : 'bg-warning/20') : 'bg-base-200/60'} rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                                    <i className={`fa-duotone fa-solid fa-triangle-exclamation text-lg ${kpis.low_conf ? (kpis.low_conf > 3 ? 'text-error' : 'text-warning') : 'text-base-content/70'}`} aria-hidden />
                                                </div>
                                            </div>
                                            <div className={`stat-value ${kpis.low_conf ? (kpis.low_conf > 3 ? 'text-error' : 'text-warning') : 'text-base-content'}`}>
                                                {kpis.low_conf}
                                            </div>
                                            {kpis.low_conf > 0 && (
                                                <div className="stat-desc">Messages need attention</div>
                                            )}
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">Escalations</div>
                                            <div className="stat-figure">
                                                <div className={`${kpis.escalations ? 'bg-warning/20' : 'bg-base-200/60'} rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                                    <i className={`fa-duotone fa-solid fa-fire text-lg ${kpis.escalations ? 'text-warning' : 'text-base-content/70'}`} aria-hidden />
                                                </div>
                                            </div>
                                            <div className={`stat-value ${kpis.escalations ? 'text-warning' : 'text-base-content'}`}>
                                                {kpis.escalations}
                                            </div>
                                            {kpis.escalations > 0 && (
                                                <div className="stat-desc">Human intervention needed</div>
                                            )}
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">Duration</div>
                                            <div className="stat-figure">
                                                <div className="bg-base-200/60 rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                    <i className="fa-duotone fa-solid fa-hourglass-half text-lg text-base-content/70" aria-hidden />
                                                </div>
                                            </div>
                                            <div className="stat-value text-base-content">{kpis.first_ts && kpis.last_ts ? humanDuration(kpis.first_ts, kpis.last_ts) : '—'}</div>
                                            {kpis.first_ts && kpis.last_ts && <div className="stat-desc">active window</div>}
                                        </div>
                                    </div>
                                </HoverScale>
                                <HoverScale scale={1.01}>
                                    <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl overflow-hidden">
                                        <div className="stat bg-base-100 rounded-2xl">
                                            <div className="stat-title">Sources</div>
                                            <div className="stat-figure">
                                                <div className={`${sources.length ? 'bg-accent/20' : 'bg-base-200/60'} rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                                                    <i className={`fa-duotone fa-solid fa-link text-lg ${sources.length ? 'text-accent' : 'text-base-content/70'}`} aria-hidden />
                                                </div>
                                            </div>
                                            <div className={`${sources.length ? 'text-accent' : 'text-base-content'} stat-value`}>{sources.length}</div>
                                            {sources.length > 0 && <div className="stat-desc">referenced</div>}
                                        </div>
                                    </div>
                                </HoverScale>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Main Content Section */}
                {convo && (
                    <StaggerContainer>
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* Transcript - Takes 2/3 width */}
                            <StaggerChild className="xl:col-span-2">
                                <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-base-content">Conversation Transcript</h3>
                                                <p className="text-sm text-base-content/60">{total} messages in this conversation</p>
                                            </div>
                                            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                                                <i className="fa-duotone fa-solid fa-messages text-sm text-primary" />
                                            </div>
                                        </div>
                                        <ConversationTranscript conversationId={convo.id} initialMessages={messages} total={total} escalations={escalations} />
                                    </div>
                                </div>
                            </StaggerChild>

                            {/* Sidebar */}
                            <StaggerChild>
                                <div className="space-y-6">
                                    {/* Metadata Card */}
                                    <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-base-content">Metadata</h3>
                                                    <p className="text-sm text-base-content/60">Conversation details</p>
                                                </div>
                                                <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center">
                                                    <i className="fa-duotone fa-solid fa-circle-info text-sm text-info" />
                                                </div>
                                            </div>
                                            <dl className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                                                    <dt className="text-sm font-medium text-base-content/70">ID</dt>
                                                    <dd className="font-mono text-xs text-base-content truncate max-w-[120px]" title={convo.id}>{convo.id.slice(0, 8)}...</dd>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                                                    <dt className="text-sm font-medium text-base-content/70">Session</dt>
                                                    <dd className="font-mono text-xs text-base-content truncate max-w-[120px]" title={convo.session_id}>{convo.session_id.slice(0, 8)}...</dd>
                                                </div>
                                                {kpis?.first_ts && (
                                                    <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                                                        <dt className="text-sm font-medium text-base-content/70">Started</dt>
                                                        <dd className="text-xs text-base-content">{new Date(kpis.first_ts).toLocaleTimeString()}</dd>
                                                    </div>
                                                )}
                                                {kpis?.last_ts && (
                                                    <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                                                        <dt className="text-sm font-medium text-base-content/70">Last</dt>
                                                        <dd className="text-xs text-base-content">{new Date(kpis.last_ts).toLocaleTimeString()}</dd>
                                                    </div>
                                                )}
                                                {kpis?.first_ts && kpis?.last_ts && (
                                                    <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                                                        <dt className="text-sm font-medium text-base-content/70">Duration</dt>
                                                        <dd className="text-xs text-base-content font-medium">{humanDuration(kpis.first_ts, kpis.last_ts)}</dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    </div>

                                    {/* Sources Card */}
                                    <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                        <div className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-base-content">Knowledge Sources</h3>
                                                    <p className="text-sm text-base-content/60">Referenced content</p>
                                                </div>
                                                <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                                                    <i className="fa-duotone fa-solid fa-link text-sm text-secondary" />
                                                </div>
                                            </div>
                                            {sources.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                        <i className="fa-duotone fa-solid fa-link-slash text-xl text-base-content/40" />
                                                    </div>
                                                    <p className="text-sm text-base-content/60">No sources referenced</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                    {sources.map(s => (
                                                        <div key={s.url} className="flex items-center gap-3 p-3 bg-base-200/40 rounded-xl border border-base-300/40 hover:bg-base-200/60 transition-colors">
                                                            <div className="w-6 h-6 bg-accent/20 rounded-md flex items-center justify-center flex-shrink-0">
                                                                <i className="fa-duotone fa-solid fa-external-link text-xs text-accent" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <a
                                                                    className="text-sm font-medium text-base-content hover:text-primary transition-colors truncate block"
                                                                    href={s.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={s.title || s.url}
                                                                >
                                                                    {s.title || new URL(s.url).hostname}
                                                                </a>
                                                                <p className="text-xs text-base-content/60 truncate">{new URL(s.url).hostname}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
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

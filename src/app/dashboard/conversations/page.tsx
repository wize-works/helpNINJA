import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale, FadeIn } from "@/components/ui/animated-page";
import { Suspense } from "react";
import FilterControls from "./filter-controls";
import Link from "next/link";
import StatCard from "@/components/ui/stat-card";

export const runtime = 'nodejs'

type Row = {
    id: string;
    session_id: string;
    created_at: string;
    messages: number;
    escalations: number;
    last_escalation_reason: string | null;
    last_escalation_status: string | null;
    site_id: string | null;
    site_domain: string | null;
    site_name: string | null;
}

type KPI = {
    conversations: number;
    messages: number;
    escalations: number;
    escalated_conversations: number;
    avg_messages: number | null;
    low_confidence_messages: number;
}

interface Filters {
    escalated?: string; // '1' (only escalated) | '0' (no escalations)
    range?: string; // '24h' | '7d' | '30d'
    search?: string; // session id contains
    site?: string; // site_id filter
}

function buildConditions(tenantId: string, filters: Filters) {
    const conditions: string[] = ['c.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.escalated === '1') {
        conditions.push('(select count(*) from public.escalations e where e.conversation_id = c.id) > 0');
    } else if (filters.escalated === '0') {
        conditions.push('(select count(*) from public.escalations e where e.conversation_id = c.id) = 0');
    }
    if (filters.search) {
        conditions.push(`c.session_id ILIKE $${idx}`);
        params.push(`%${filters.search}%`);
        idx++;
    }
    if (filters.site) {
        conditions.push(`c.site_id = $${idx}`);
        params.push(filters.site);
        idx++;
    }
    if (filters.range) {
        const map: Record<string, string> = {
            '24h': "NOW() - INTERVAL '24 hours'",
            '7d': "NOW() - INTERVAL '7 days'",
            '30d': "NOW() - INTERVAL '30 days'"
        };
        if (map[filters.range]) {
            conditions.push(`c.created_at >= ${map[filters.range]}`);
        }
    }
    return { where: conditions.join(' AND '), params };
}

async function list(tenantId: string, filters: Filters) {
    const { where, params } = buildConditions(tenantId, filters);
    const { rows } = await query<Row>(
        `select c.id, c.session_id, c.created_at,
            (select count(*) from public.messages m where m.conversation_id=c.id)::int as messages,
            (select count(*) from public.escalations e where e.conversation_id=c.id)::int as escalations,
            (select e.reason from public.escalations e where e.conversation_id=c.id order by e.created_at desc limit 1) as last_escalation_reason,
            (select e.status from public.escalations e where e.conversation_id=c.id order by e.created_at desc limit 1) as last_escalation_status,
            c.site_id,
            ts.domain as site_domain,
            ts.name as site_name
         from public.conversations c
         left join public.tenant_sites ts on ts.id = c.site_id
         where ${where}
         order by c.created_at desc
         limit 100`,
        params
    );
    return rows;
}

async function getKpis(tenantId: string, filters: Filters): Promise<KPI> {
    const { where, params } = buildConditions(tenantId, filters);
    // Build KPI aggregates based on filtered conversation set using CTE
    const { rows } = await query<KPI>(
        `WITH filtered_convos AS (
            SELECT c.id FROM public.conversations c WHERE ${where}
        ), convo_message_counts AS (
            SELECT conversation_id, COUNT(*)::int as mc FROM public.messages m
            WHERE m.tenant_id = $1 AND m.conversation_id IN (SELECT id FROM filtered_convos)
            GROUP BY conversation_id
        )
        SELECT 
            (SELECT COUNT(*) FROM filtered_convos)::int AS conversations,
            (SELECT COALESCE(SUM(mc),0) FROM convo_message_counts)::int AS messages,
            (SELECT COUNT(*) FROM public.escalations e WHERE e.tenant_id=$1 AND e.conversation_id IN (SELECT id FROM filtered_convos))::int AS escalations,
            (SELECT COUNT(DISTINCT e.conversation_id) FROM public.escalations e WHERE e.tenant_id=$1 AND e.conversation_id IN (SELECT id FROM filtered_convos))::int AS escalated_conversations,
            (SELECT COALESCE(ROUND(AVG(mc)::numeric,2),0)::float FROM convo_message_counts) AS avg_messages,
            (SELECT COUNT(*) FROM public.messages m2 WHERE m2.tenant_id=$1 AND m2.role='assistant' AND m2.confidence < 0.55 AND m2.conversation_id IN (SELECT id FROM filtered_convos))::int AS low_confidence_messages
        `,
        params
    );
    return rows[0] || { conversations: 0, messages: 0, escalations: 0, escalated_conversations: 0, avg_messages: 0, low_confidence_messages: 0 };
}

function ConversationsTable({ conversations }: { conversations: Row[] }) {
    if (conversations.length === 0) {
        return (
            <FadeIn>
                <div className="card bg-base-100 rounded-2xl shadow-sm">
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <i className="fa-duotone fa-solid fa-messages text-3xl text-secondary" aria-hidden />
                        </div>
                        <h3 className="text-xl font-semibold text-base-content mb-3">No conversations yet</h3>
                        <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                            Customer conversations will appear here when users interact with your AI support chat widget.
                            Get started by setting up your chat widget.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <HoverScale scale={1.02}>
                                <a href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-content rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200">
                                    <i className="fa-duotone fa-solid fa-comment" aria-hidden />
                                    Set up chat widget
                                </a>
                            </HoverScale>
                            <div className="flex items-center gap-2 text-sm text-base-content/50">
                                <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
                                <span>Test your widget to see conversations here</span>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeIn>
        );
    }

    return (
        <StaggerContainer>
            {/* Desktop Table */}
            <StaggerChild>
                <div className="hidden lg:block card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">Conversation History</h3>
                                <p className="text-sm text-base-content/60">Customer interactions and support sessions</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-base-content/60">
                                <i className="fa-duotone fa-solid fa-comments text-xs" aria-hidden />
                                <span>{conversations.length} conversations</span>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-base-200/60">
                            <table className="w-full">
                                <thead className="bg-base-200/40">
                                    <tr>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Session</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Site</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Activity</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Started</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Escalations</th>
                                        <th className="text-right p-4 text-sm font-semibold text-base-content/80">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-200/60">
                                    {conversations.map((r, index) => (
                                        <tr key={r.id} className="hover:bg-base-200/30 hover:scale-[1.002] transition-all duration-200">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <i className="fa-duotone fa-solid fa-user text-sm text-secondary" aria-hidden />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <Link href={`/dashboard/conversations/${r.id}`} className="font-mono text-sm text-primary hover:text-primary/80 truncate transition-colors" title={r.session_id} prefetch>
                                                            {r.session_id}
                                                        </Link>
                                                        <div className="text-xs text-base-content/60 mt-0.5">
                                                            Session #{index + 1}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {r.site_id ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-base-200/60 text-xs font-medium text-base-content/80">
                                                        <i className="fa-duotone fa-solid fa-globe text-[10px] opacity-70" aria-hidden />
                                                        {r.site_domain || r.site_name || 'Site'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-base-content/40">—</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 px-2 py-1 bg-info/10 text-info rounded-md">
                                                        <i className="fa-duotone fa-solid fa-messages text-xs" aria-hidden />
                                                        <span className="text-sm font-medium">{r.messages}</span>
                                                    </div>
                                                    <span className="text-sm text-base-content/60">messages</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-base-content">
                                                    {new Date(r.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-xs text-base-content/60 mt-0.5">
                                                    {new Date(r.created_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {r.escalations > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-2 px-2 py-1 bg-warning/10 text-warning rounded-md" title={r.last_escalation_reason || undefined}>
                                                            <i className="fa-duotone fa-solid fa-fire text-xs" aria-hidden />
                                                            <span className="text-sm font-medium">{r.escalations}</span>
                                                        </div>
                                                        <span className="text-xs text-base-content/60">
                                                            {r.last_escalation_reason ? r.last_escalation_reason.replace(/_/g, ' ') : 'escalations'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-base-content/40">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                                <Link href={`/dashboard/conversations/${r.id}`} className="inline-flex items-center gap-1 px-2 py-1 bg-base-200/60 hover:bg-base-200 rounded-md text-xs font-medium text-base-content/80 transition-colors">
                                                    <i className="fa-duotone fa-solid fa-eye text-[10px]" aria-hidden /> View
                                                </Link>
                                                {r.escalations > 0 ? (
                                                    <span className="inline-flex items-center gap-2 px-2 py-1 bg-warning/10 text-warning rounded-md text-xs font-medium" title={r.last_escalation_status || undefined}>
                                                        <div className="w-1.5 h-1.5 bg-warning rounded-full"></div>
                                                        Escalated
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-2 px-2 py-1 bg-success/10 text-success rounded-md text-xs font-medium">
                                                        <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </StaggerChild>

            {/* Mobile/Tablet Cards */}
            <StaggerChild>
                <div className="lg:hidden space-y-4">
                    {conversations.map((r, index) => (
                        <HoverScale key={r.id} scale={1.02}>
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-user text-secondary" aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-base-content mb-1">
                                                    Session #{index + 1}
                                                </h3>
                                                <div className="text-sm text-base-content/60">
                                                    Started {new Date(r.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })} at {new Date(r.created_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-success/10 text-success rounded-md text-xs font-medium">
                                            <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                                            Completed
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-base-200/40 rounded-xl p-3 border border-base-300/40">
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-fingerprint text-xs text-base-content/60" aria-hidden />
                                                <span className="text-xs font-medium text-base-content/60 uppercase tracking-wide">Session ID</span>
                                            </div>
                                            <div className="font-mono text-sm text-base-content break-all">
                                                {r.session_id}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-2 bg-info/10 text-info rounded-lg">
                                                    <i className="fa-duotone fa-solid fa-messages text-xs" aria-hidden />
                                                    <span className="text-sm font-semibold">{r.messages}</span>
                                                    <span className="text-xs opacity-80">messages</span>
                                                </div>
                                                {r.site_id && (
                                                    <div className="flex items-center gap-1 px-3 py-2 bg-base-200/60 text-base-content/70 rounded-lg">
                                                        <i className="fa-duotone fa-solid fa-globe text-xs" aria-hidden />
                                                        <span className="text-xs font-medium truncate max-w-[100px]">
                                                            {r.site_domain || r.site_name || 'Site'}
                                                        </span>
                                                    </div>
                                                )}
                                                {r.escalations > 0 && (
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 text-warning rounded-lg" title={r.last_escalation_reason || undefined}>
                                                        <i className="fa-duotone fa-solid fa-fire text-xs" aria-hidden />
                                                        <span className="text-sm font-semibold">{r.escalations}</span>
                                                        <span className="text-xs opacity-80">esc</span>
                                                    </div>
                                                )}
                                                <HoverScale scale={1.05}>
                                                    <Link href={`/dashboard/conversations/${r.id}`} className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors">
                                                        <i className="fa-duotone fa-solid fa-eye text-xs" aria-hidden />
                                                        View
                                                    </Link>
                                                </HoverScale>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </HoverScale>
                    ))}
                </div>
            </StaggerChild>
        </StaggerContainer>
    );
}

async function listSites(tenantId: string) {
    const { rows } = await query<{ id: string; domain: string; name: string }>(
        `select id, domain, name from public.tenant_sites where tenant_id=$1 order by created_at desc limit 50`,
        [tenantId]
    );
    return rows;
}

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const resolved = await searchParams;
    const filters: Filters = {
        escalated: typeof resolved.escalated === 'string' ? resolved.escalated : undefined,
        range: typeof resolved.range === 'string' ? resolved.range : undefined,
        search: typeof resolved.search === 'string' ? resolved.search : undefined,
        site: typeof resolved.site === 'string' ? resolved.site : undefined
    };
    const tenantId = await getTenantIdStrict()
    const sites = await listSites(tenantId);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Conversations", icon: "fa-messages" }
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

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Conversations</h1>
                                <p className="text-base-content/60 mt-2">
                                    Monitor and analyze customer interactions with your AI support agent
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <FilterControls filters={filters} sites={sites} />
                                <HoverScale scale={1.02}>
                                    <button className="btn btn-secondary btn-sm rounded-lg">
                                        <i className="fa-duotone fa-solid fa-download text-xs" aria-hidden />
                                        Export
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <Suspense fallback={
                    <div className="space-y-4">
                        <TableSkeleton rows={5} columns={4} />
                    </div>
                }>
                    <ConversationsContent tenantId={tenantId} filters={filters} />
                </Suspense>
            </div>
        </AnimatedPage>
    )
}

async function ConversationsContent({ tenantId, filters }: { tenantId: string; filters: Filters }) {
    const [conversations, kpis] = await Promise.all([
        list(tenantId, filters),
        getKpis(tenantId, filters)
    ]);

    const escalationRate = kpis.conversations ? (kpis.escalated_conversations / kpis.conversations) * 100 : 0;
    return (
        <div className="space-y-10">
            {/* KPI Cards */}
            <StaggerContainer>
                <StaggerChild>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 xl:grid-cols-4 gap-6">
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Conversations"
                                value={kpis.conversations}
                                description="total conversations"
                                icon="fa-messages"
                                color="primary"
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Messages"
                                value={kpis.messages}
                                description="total messages"
                                icon="fa-message-lines"
                                color="info"
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Avg. Messages"
                                value={kpis.avg_messages ? kpis.avg_messages.toFixed(1) : '0'}
                                description="per conversation"
                                icon="fa-chart-simple"
                                color="accent"
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Escalation Rate"
                                value={`${escalationRate.toFixed(1)}%`}
                                description="of conversations"
                                icon="fa-gauge-high"
                                color="secondary"
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Low Confidence"
                                value={kpis.low_confidence_messages}
                                description="assistant messages"
                                icon="fa-triangle-exclamation"
                                color={kpis.low_confidence_messages > 10 ? 'error' : kpis.low_confidence_messages > 0 ? 'warning' : 'info'}
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Healthy Convos"
                                value={kpis.conversations - kpis.escalated_conversations}
                                description="no escalations"
                                icon="fa-badge-check"
                                color="success"
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Escalated Convos"
                                value={kpis.escalated_conversations}
                                description="unique sessions"
                                icon="fa-fire-flame"
                                color={kpis.escalated_conversations ? 'warning' : 'info'}
                            />
                        </HoverScale>
                        <HoverScale scale={1.01}>
                            <StatCard
                                title="Escalations"
                                value={kpis.escalations ? kpis.escalations.toFixed(1) : '0'}
                                description="total escalations"
                                icon="fa-fire"
                                color="error"
                            />
                        </HoverScale>
                    </div>
                </StaggerChild>
            </StaggerContainer>
            <ConversationsTable conversations={conversations} />
        </div>
    );
}

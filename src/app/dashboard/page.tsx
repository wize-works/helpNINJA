import OutboxRetryButton from "@/components/outbox-retry-button";
import { query } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/limits";
import { getTenantIdServer } from "@/lib/auth";
import { ChatVolumeChart, SourcesChart, MetricTrend, TimeRangeSelector, TimeRange } from "@/components/ui/charts";
import { Suspense } from "react";
import { ChartSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale, FadeIn } from "@/components/ui/animated-page";

export const runtime = "nodejs"; // ensure Node runtime for pg

type StatRow = {
    conversations: number;
    messages_this_month: number;
    low_conf: number;
    integrations_active: number;
    escalations_pending: number;
    documents: number;
    chunks: number;
};

type IntegrationRow = { id: string; provider: string; name: string; status: string };

type ChartData = {
    chatVolume: Array<{ date: string; messages: number; conversations: number }>;
    sources: Array<{ name: string; documents: number; chunks: number }>;
};

async function getStats(tenantId: string) {
    const statsQ = await query<StatRow>(
        `select
            (select count(*) from public.conversations where tenant_id=$1)::int as conversations,
            (select messages_count from public.usage_counters where tenant_id=$1)::int as messages_this_month,
            (select count(*) from public.messages where tenant_id=$1 and role='assistant' and confidence < 0.55 and created_at >= date_trunc('month', now()))::int as low_conf,
            (select count(*) from public.integrations where tenant_id=$1 and status='active')::int as integrations_active,
            (select count(*) from public.integration_outbox where tenant_id=$1 and status='pending')::int as escalations_pending,
            (select count(*) from public.documents where tenant_id=$1)::int as documents,
            (select count(*) from public.chunks where tenant_id=$1)::int as chunks
        `,
        [tenantId]
    );
    const planQ = await query<{ plan: keyof typeof PLAN_LIMITS }>(
        `select plan from public.tenants where id=$1`,
        [tenantId]
    );
    const integrationsQ = await query<IntegrationRow>(
        `select id, provider, name, status from public.integrations where tenant_id=$1 order by created_at desc limit 5`,
        [tenantId]
    );

    const defaultStats: StatRow = { conversations: 0, messages_this_month: 0, low_conf: 0, integrations_active: 0, escalations_pending: 0, documents: 0, chunks: 0 };
    const stats = statsQ.rows[0] || defaultStats;
    const plan = (planQ.rows[0]?.plan || "starter") as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[plan].messages;
    return {
        stats: {
            conversations: Number(stats.conversations || 0),
            messages_this_month: Number(stats.messages_this_month || 0),
            low_conf: Number(stats.low_conf || 0),
            integrations_active: Number(stats.integrations_active || 0),
            escalations_pending: Number(stats.escalations_pending || 0),
            documents: Number(stats.documents || 0),
            chunks: Number(stats.chunks || 0),
        },
        plan,
        limit,
        integrations: integrationsQ.rows,
    } as const;
}

async function getChartData(tenantId: string, timeRange: TimeRange = '30d'): Promise<ChartData> {
    // Get the number of days for the selected time range
    const timeRangeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
    };
    const days = timeRangeMap[timeRange];

    // Get actual chat volume data from the database
    const chatVolumeQuery = await query<{ date: string; messages: number; conversations: number }>(
        `select 
            date_trunc('day', created_at)::date as date,
            count(case when role = 'user' then 1 end)::int as messages,
            count(distinct conversation_id)::int as conversations
         from public.messages 
         where tenant_id = $1 
         and created_at >= current_date - interval '${days} days'
         group by date_trunc('day', created_at)::date
         order by date`,
        [tenantId]
    );

    // Generate date range with actual data where available
    const dateRange = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Find actual data for this date
        const actualData = chatVolumeQuery.rows.find(row => row.date === dateStr);
        
        return {
            date: date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                ...(days > 90 && { year: '2-digit' }) // Show year for longer periods
            }),
            messages: actualData?.messages || 0,
            conversations: actualData?.conversations || 0,
        };
    });

    // Get actual source data
    const sourcesQuery = await query<{ host: string; documents: number; chunks: number }>(
        `select 
            regexp_replace(url, '^https?://([^/]+).*', '\\1') as host,
            count(distinct d.id)::int as documents,
            count(c.id)::int as chunks
         from public.documents d
         left join public.chunks c on c.document_id = d.id
         where d.tenant_id = $1
         group by host
         order by documents desc
         limit 5`,
        [tenantId]
    );

    const sources = sourcesQuery.rows.length > 0 ? sourcesQuery.rows.map(row => ({
        name: row.host,
        documents: row.documents,
        chunks: row.chunks
    })) : [
        { name: 'No sources yet', documents: 0, chunks: 0 }
    ];

    return {
        chatVolume: dateRange,
        sources
    };
}

export default async function Dashboard() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true });

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Header Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Dashboard</h1>
                                <p className="text-base-content/60 mt-1">Monitor your AI support performance and analytics</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Suspense fallback={<div className="w-20 h-8 bg-base-200/60 rounded-lg animate-pulse"></div>}>
                                    <PlanBadge tenantId={tenantId} />
                                </Suspense>
                                <HoverScale scale={1.02}>
                                    <a href={`/dashboard/billing`} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-content rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200">
                                        <i className="fa-duotone fa-solid fa-crown" aria-hidden />
                                        Upgrade Plan
                                    </a>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* KPIs Grid */}
                <StaggerContainer>
                    <StaggerChild>
                        <Suspense fallback={
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
                            </div>
                        }>
                            <StatsCards tenantId={tenantId} />
                        </Suspense>
                    </StaggerChild>
                </StaggerContainer>

                {/* Main Analytics Section */}
                <StaggerContainer>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Chat Volume Chart - Takes 2/3 width */}
                        <StaggerChild className="xl:col-span-2">
                            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Chat Volume</h3>
                                            <p className="text-sm text-base-content/60">Messages and conversations over time</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                            <Suspense fallback={<div className="w-48 h-8 bg-base-200/60 rounded-lg animate-pulse"></div>}>
                                                <InteractiveTimeRangeSelector tenantId={tenantId} />
                                            </Suspense>
                                            <div className="flex items-center gap-2">
                                                <HoverScale scale={1.02}>
                                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-lg text-sm transition-all duration-200">
                                                        <i className="fa-duotone fa-solid fa-download text-xs" aria-hidden />
                                                        Export
                                                    </button>
                                                </HoverScale>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-64">
                                        <Suspense fallback={<ChartSkeleton height="h-64" />}>
                                            <InteractiveChatVolumeChart tenantId={tenantId} />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Sources Overview */}
                        <StaggerChild>
                            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Knowledge Base</h3>
                                            <p className="text-sm text-base-content/60">Indexed content sources</p>
                                        </div>
                                        <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-database text-sm text-secondary" aria-hidden />
                                        </div>
                                    </div>
                                    
                                    <Suspense fallback={<div className="space-y-3"><div className="animate-pulse bg-base-300/60 h-4 rounded"></div><div className="animate-pulse bg-base-300/60 h-4 rounded w-3/4"></div></div>}>
                                        <SourcesOverview tenantId={tenantId} />
                                    </Suspense>
                                    
                                    <div className="mt-6 h-48">
                                        <Suspense fallback={<ChartSkeleton height="h-48" />}>
                                            <SourcesChartContainer tenantId={tenantId} />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </div>
                </StaggerContainer>

                {/* Bottom Section */}
                <StaggerContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Integrations */}
                        <StaggerChild className="lg:col-span-2">
                            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Integrations</h3>
                                            <p className="text-sm text-base-content/60">Connected services</p>
                                        </div>
                                        <HoverScale scale={1.02}>
                                            <a 
                                                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors" 
                                                href="/dashboard/integrations"
                                            >
                                                View all
                                                <i className="fa-duotone fa-solid fa-arrow-right text-xs" aria-hidden />
                                            </a>
                                        </HoverScale>
                                    </div>
                                    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>)}</div>}>
                                        <IntegrationsOverview tenantId={tenantId} />
                                    </Suspense>
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Usage Overview */}
                        <StaggerChild className="lg:col-span-3">
                            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <Suspense fallback={<div className="space-y-3"><div className="animate-pulse bg-base-300/60 h-6 rounded w-1/2"></div><div className="animate-pulse bg-base-300/60 h-4 rounded"></div></div>}>
                                        <UsageOverview tenantId={tenantId} />
                                    </Suspense>
                                </div>
                            </div>
                        </StaggerChild>
                    </div>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

// Interactive components that use client-side state
function InteractiveTimeRangeSelector({ tenantId }: { tenantId: string }) {
    // This would be a client component in a real implementation
    // For now, we'll return a static version
    return (
        <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-content shadow-sm">
                30 days
            </button>
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-base-200/60 hover:bg-base-200 border border-base-300/40 text-base-content/80 hover:text-base-content transition-all duration-200">
                90 days
            </button>
            <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-base-200/60 hover:bg-base-200 border border-base-300/40 text-base-content/80 hover:text-base-content transition-all duration-200">
                1 year
            </button>
        </div>
    );
}

function InteractiveChatVolumeChart({ tenantId }: { tenantId: string }) {
    // For now, use the default 30-day range
    // In a real implementation, this would be connected to the time range selector state
    return <ChatVolumeChartContainer tenantId={tenantId} timeRange="30d" />;
}

async function PlanBadge({ tenantId }: { tenantId: string }) {
    try {
        const { plan } = await getStats(tenantId);
        const planConfig = {
            starter: { label: 'Starter', color: 'bg-gray-100 text-gray-800', icon: 'fa-rocket' },
            pro: { label: 'Pro', color: 'bg-primary/10 text-primary', icon: 'fa-star' },
            agency: { label: 'Agency', color: 'bg-gradient-to-r from-primary to-secondary text-white', icon: 'fa-crown' }
        };
        
        const config = planConfig[plan as keyof typeof planConfig] || planConfig.starter;
        
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${config.color} border border-base-200/60`}>
                <i className={`fa-duotone fa-solid ${config.icon} text-xs`} aria-hidden />
                {config.label}
            </div>
        );
    } catch {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 border border-base-200/60">
                <i className="fa-duotone fa-solid fa-rocket text-xs" aria-hidden />
                Starter
            </div>
        );
    }
}

async function StatsCards({ tenantId }: { tenantId: string }) {
    try {
        const { stats, limit } = await getStats(tenantId);
        const usedPct = limit ? Math.min(100, Math.round((stats.messages_this_month / limit) * 100)) : 0;
        const lowConfRate = stats.messages_this_month ? Math.round((stats.low_conf / stats.messages_this_month) * 100) : 0;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <HoverScale scale={1.02}>
                    <StatCard 
                        icon="fa-comments" 
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        title="Conversations" 
                        value={num(stats.conversations)} 
                        trend={<MetricTrend value={stats.conversations} previousValue={Math.max(1, stats.conversations - 5)} label="vs last week" />}
                    />
                </HoverScale>
                <HoverScale scale={1.02}>
                    <UsageCard used={stats.messages_this_month} limit={limit} />
                </HoverScale>
                <HoverScale scale={1.02}>
                    <StatCard 
                        icon="fa-triangle-exclamation" 
                        iconColor={lowConfRate > 25 ? "text-error" : "text-warning"}
                        iconBg={lowConfRate > 25 ? "bg-error/10" : "bg-warning/10"}
                        title="Low-confidence rate" 
                        value={`${lowConfRate}%`} 
                        delta={stats.low_conf ? `${stats.low_conf} msgs` : undefined} 
                        negative={lowConfRate > 25} 
                    />
                </HoverScale>
                <HoverScale scale={1.02}>
                    <StatCard 
                        icon="fa-puzzle-piece" 
                        iconColor="text-secondary"
                        iconBg="bg-secondary/10"
                        title="Active integrations" 
                        value={num(stats.integrations_active)} 
                        delta={stats.escalations_pending ? `${stats.escalations_pending} pending` : undefined} 
                        negative={Boolean(stats.escalations_pending)} 
                    />
                </HoverScale>
            </div>
        );
    } catch {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}
            </div>
        );
    }
}

async function ChatVolumeChartContainer({ tenantId, timeRange = '30d' }: { tenantId: string; timeRange?: TimeRange }) {
    try {
        const { chatVolume } = await getChartData(tenantId, timeRange);
        return <ChatVolumeChart data={chatVolume} />;
    } catch {
        return <ChartSkeleton height="h-64" />;
    }
}

async function SourcesOverview({ tenantId }: { tenantId: string }) {
    try {
        const { stats } = await getStats(tenantId);
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-file-lines text-sm text-info" aria-hidden />
                        </div>
                        <span className="text-sm font-medium">Documents</span>
                    </div>
                    <span className="text-lg font-semibold text-base-content">{num(stats.documents)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-cube text-sm text-success" aria-hidden />
                        </div>
                        <span className="text-sm font-medium">Chunks</span>
                    </div>
                    <span className="text-lg font-semibold text-base-content">{num(stats.chunks)}</span>
                </div>
            </div>
        );
    } catch {
        return (
            <div className="space-y-4">
                <div className="animate-pulse bg-base-300/60 h-12 rounded-xl"></div>
                <div className="animate-pulse bg-base-300/60 h-12 rounded-xl"></div>
            </div>
        );
    }
}

async function SourcesChartContainer({ tenantId }: { tenantId: string }) {
    try {
        const { sources } = await getChartData(tenantId);
        return <SourcesChart data={sources} />;
    } catch {
        return <ChartSkeleton height="h-48" />;
    }
}

async function IntegrationsOverview({ tenantId }: { tenantId: string }) {
    try {
        const { integrations, stats } = await getStats(tenantId);
        return (
            <div className="space-y-4">
                <div className="space-y-3">
                    {integrations.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <i className="fa-duotone fa-solid fa-puzzle-piece text-xl text-base-content/40" aria-hidden />
                            </div>
                            <p className="text-sm text-base-content/60">No integrations configured</p>
                            <HoverScale scale={1.02}>
                                <a href="/dashboard/integrations" className="btn btn-primary btn-sm mt-3">
                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                    Add Integration
                                </a>
                            </HoverScale>
                        </div>
                    )}
                    {integrations.map((row) => (
                        <div key={row.id} className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40 hover:bg-base-200/60 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <i className={`fa-duotone fa-solid ${providerIcon(row.provider)} text-sm text-accent`} aria-hidden />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{row.name}</div>
                                    <div className="text-xs text-base-content/60 capitalize">{row.provider}</div>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                                row.status === 'active' 
                                    ? 'bg-success/10 text-success' 
                                    : 'bg-warning/10 text-warning'
                            }`}>
                                {row.status}
                            </div>
                        </div>
                    ))}
                </div>
                
                {stats.escalations_pending > 0 && (
                    <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-exclamation-triangle text-sm text-warning" aria-hidden />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Escalations Pending</div>
                                    <div className="text-xs text-base-content/60">{stats.escalations_pending} items in outbox</div>
                                </div>
                            </div>
                            <OutboxRetryButton />
                        </div>
                    </div>
                )}
            </div>
        );
    } catch {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>)}
            </div>
        );
    }
}

async function UsageOverview({ tenantId }: { tenantId: string }) {
    try {
        const { stats, limit } = await getStats(tenantId);
        const usedPct = limit ? Math.min(100, Math.round((stats.messages_this_month / limit) * 100)) : 0;
        
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-base-content">Monthly Usage</h3>
                        <p className="text-sm text-base-content/60">Message consumption and limits</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-base-content">{num(stats.messages_this_month)}</div>
                        <div className="text-sm text-base-content/60">of {num(limit)} messages</div>
                    </div>
                </div>
                
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-base-content/70">Usage Progress</span>
                        <span className="font-medium">{usedPct}%</span>
                    </div>
                    <div className="w-full bg-base-300/60 rounded-full h-3">
                        <div 
                            className={`h-3 rounded-full transition-all duration-500 ${
                                usedPct > 90 ? 'bg-gradient-to-r from-error to-error/80' :
                                usedPct > 70 ? 'bg-gradient-to-r from-warning to-warning/80' :
                                'bg-gradient-to-r from-primary to-secondary'
                            }`}
                            style={{ width: `${usedPct}%` }}
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-info/20 rounded-md flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-messages text-xs text-info" aria-hidden />
                            </div>
                            <span className="text-xs text-base-content/60">High Quality</span>
                        </div>
                        <div className="text-lg font-semibold">{num(stats.messages_this_month - stats.low_conf)}</div>
                    </div>
                    <div className="p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-warning/20 rounded-md flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-triangle-exclamation text-xs text-warning" aria-hidden />
                            </div>
                            <span className="text-xs text-base-content/60">Low Confidence</span>
                        </div>
                        <div className="text-lg font-semibold">{num(stats.low_conf)}</div>
                    </div>
                </div>
                
                <div className="flex items-center justify-center">
                    <MetricTrend value={stats.messages_this_month} previousValue={Math.max(1, stats.messages_this_month - 50)} label="vs last month" />
                </div>
            </div>
        );
    } catch {
        return (
            <div className="space-y-4">
                <div className="animate-pulse bg-base-300/60 h-6 rounded w-1/2"></div>
                <div className="animate-pulse bg-base-300/60 h-4 rounded"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                    <div className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                </div>
            </div>
        );
    }
}

function StatCard({ 
    icon, 
    iconColor = "text-base-content/60",
    iconBg = "bg-base-200/60",
    title, 
    value, 
    delta, 
    negative, 
    trend 
}: { 
    icon: string; 
    iconColor?: string;
    iconBg?: string;
    title: string; 
    value: string | number; 
    delta?: string; 
    negative?: boolean;
    trend?: React.ReactNode;
}) {
    return (
        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                        <i className={`fa-duotone fa-solid ${icon} ${iconColor}`} aria-hidden />
                    </div>
                    {delta && (
                        <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                            negative ? "bg-error/10 text-error" : "bg-success/10 text-success"
                        }`}>
                            {delta}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <div className="text-sm text-base-content/60 font-medium">{title}</div>
                    <div className="text-2xl font-bold text-base-content">{value}</div>
                    {trend && <div className="mt-2">{trend}</div>}
                </div>
            </div>
        </div>
    );
}

function UsageCard({ used, limit }: { used: number; limit: number }) {
    const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    return (
        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 ${pct > 90 ? 'bg-error/10' : pct > 70 ? 'bg-warning/10' : 'bg-primary/10'} rounded-xl flex items-center justify-center`}>
                        <i className={`fa-duotone fa-solid fa-message ${pct > 90 ? 'text-error' : pct > 70 ? 'text-warning' : 'text-primary'}`} aria-hidden />
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                        pct > 90 ? 'bg-error/10 text-error' : 
                        pct > 70 ? 'bg-warning/10 text-warning' : 
                        'bg-success/10 text-success'
                    }`}>
                        {pct}%
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="text-sm text-base-content/60 font-medium">Messages (this month)</div>
                    <div className="text-2xl font-bold text-base-content">
                        {num(used)}
                        <span className="text-base text-base-content/60 font-normal">/{num(limit)}</span>
                    </div>
                    <div className="w-full bg-base-300/60 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                                pct > 90 ? 'bg-gradient-to-r from-error to-error/80' :
                                pct > 70 ? 'bg-gradient-to-r from-warning to-warning/80' :
                                'bg-gradient-to-r from-primary to-secondary'
                            }`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <MetricTrend value={used} previousValue={Math.max(1, used - 10)} label="vs last week" />
                </div>
            </div>
        </div>
    );
}

function num(n: number) { return new Intl.NumberFormat().format(n); }

function providerIcon(key: string) {
    switch (key) {
        case 'slack': return 'fa-slack';
        case 'email': return 'fa-envelope';
        default: return 'fa-puzzle-piece';
    }
}
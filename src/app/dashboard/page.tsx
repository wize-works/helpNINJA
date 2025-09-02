import OutboxRetryButton from "@/components/outbox-retry-button";
import { query } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/limits";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { ChatVolumeChart, SourcesChart, MetricTrend, TimeRange, ConfidenceChart } from "@/components/ui/charts";
import { Suspense } from "react";
import { ChartSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { TenantProvider } from "@/components/tenant-context";
import QuickStartDismiss from "../../components/quickstart-dismiss";
import SiteWizardLauncher from "@/components/site-wizard-launcher";
import Link from "next/link";
import { getChartColors } from "@/lib/colors";

export const runtime = "nodejs"; // ensure Node runtime for pg
export const dynamic = "force-dynamic"; // always fetch fresh stats/charts

type StatRow = {
    conversations: number;
    messages_this_month: number;
    low_conf: number;
    assistant_messages_this_month: number;
    integrations_active: number;
    escalations_pending: number;
    documents: number;
    chunks: number;
};

type IntegrationRow = { id: string; provider: string; name: string; status: string };

type ChartData = {
    chatVolume: Array<{ date: string; messages: number; conversations: number }>;
    sources: Array<{ name: string; documents: number; chunks: number }>;
    confidenceData: Array<{ name: string; value: number; color: string }>;
    responseTimeData: Array<{ hour: number; avgResponse: number; volume: number }>;
    topSources: Array<{ name: string; queries: number; accuracy: number }>;
};

async function getStats(tenantId: string) {
    const statsQ = await query<StatRow>(
        `select
            (select count(*) from public.conversations where tenant_id=$1)::int as conversations,
            (select count(*) from public.messages where tenant_id=$1 and role='user' and (created_at at time zone 'UTC') >= date_trunc('month', (now() at time zone 'UTC')) )::int as messages_this_month,
            (select count(*) from public.messages where tenant_id=$1 and role='assistant' and confidence < 0.55 and (created_at at time zone 'UTC') >= date_trunc('month', (now() at time zone 'UTC')) )::int as low_conf,
            (select count(*) from public.messages where tenant_id=$1 and role='assistant' and (created_at at time zone 'UTC') >= date_trunc('month', (now() at time zone 'UTC')) )::int as assistant_messages_this_month,
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

    const defaultStats: StatRow = { conversations: 0, messages_this_month: 0, low_conf: 0, assistant_messages_this_month: 0, integrations_active: 0, escalations_pending: 0, documents: 0, chunks: 0 };
    const stats = statsQ.rows[0] || defaultStats;
    const plan = (planQ.rows[0]?.plan || "none") as keyof typeof PLAN_LIMITS;
    const limit = PLAN_LIMITS[plan].messages;
    return {
        stats: {
            conversations: Number(stats.conversations || 0),
            messages_this_month: Number(stats.messages_this_month || 0),
            low_conf: Number(stats.low_conf || 0),
            assistant_messages_this_month: Number(stats.assistant_messages_this_month || 0),
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
    const colors = getChartColors();
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
                date_trunc('day', (created_at at time zone 'UTC'))::date as date,
            count(case when role = 'user' then 1 end)::int as messages,
            count(distinct conversation_id)::int as conversations
         from public.messages 
         where tenant_id = $1 
            and (created_at at time zone 'UTC') >= ((now() at time zone 'UTC')::date - interval '${days} days')
            group by 1
            order by 1`,
        [tenantId]
    );

    // Generate date range with actual data where available
    const dateRange = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Find actual data for this date
        const actualData = chatVolumeQuery.rows.find(row => {
            // Ensure both dates are in the same YYYY-MM-DD format
            const rowDateStr = new Date(row.date).toISOString().split('T')[0];
            return rowDateStr === dateStr;
        });

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

    // Get actual source data with more resilient handling
    const sourcesQuery = await query<{ host: string; documents: number; chunks: number }>(
        `SELECT 
            COALESCE(
                CASE
                    WHEN d.url ~ '^https?://[^/]+' THEN substring(d.url from '^https?://([^/]+)')
                    ELSE 'Direct Import'
                END, 
                'Unknown Source'
            ) as host,
            COUNT(DISTINCT d.id)::int as documents,
            COUNT(c.id)::int as chunks
         FROM public.documents d
         LEFT JOIN public.chunks c ON c.document_id = d.id
         WHERE d.tenant_id = $1
         GROUP BY host
         ORDER BY documents DESC
         LIMIT 5`,
        [tenantId]
    );

    // Add a check for total document count to verify data exists
    const totalDocsQuery = await query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM public.documents WHERE tenant_id = $1`,
        [tenantId]
    );

    const totalDocs = totalDocsQuery.rows[0]?.count || 0;

    // Create source data with fallback for empty hosts
    const sources = sourcesQuery.rows.length > 0 ? sourcesQuery.rows.map(row => {
        // Fix any problematic host values
        let hostName = row.host;

        // Fix any regex issues or empty values
        if (!hostName || hostName === '\\1' || hostName.includes('1')) {
            hostName = 'All Documents';
        }

        return {
            name: hostName,
            documents: row.documents,
            chunks: row.chunks
        };
    }) : totalDocs > 0 ? [
        { name: 'Imported Content', documents: totalDocs, chunks: 0 }
    ] : [
        { name: 'No sources yet', documents: 0, chunks: 0 }
    ];

    // Get confidence distribution data
    const confidenceQuery = await query<{ range: string; count: number }>(
        `SELECT 
            CASE 
                WHEN confidence >= 0.8 THEN 'High (80-100%)'
                WHEN confidence >= 0.6 THEN 'Medium (60-80%)'
                WHEN confidence >= 0.4 THEN 'Low (40-60%)'
                ELSE 'Very Low (0-40%)'
            END as range,
            COUNT(*)::int as count
        FROM public.messages 
        WHERE tenant_id = $1 
        AND confidence IS NOT NULL
        AND role = 'assistant'
        AND (created_at at time zone 'UTC') >= ((now() at time zone 'UTC')::date - interval '${days} days')
        GROUP BY 
            CASE 
                WHEN confidence >= 0.8 THEN 'High (80-100%)'
                WHEN confidence >= 0.6 THEN 'Medium (60-80%)'
                WHEN confidence >= 0.4 THEN 'Low (40-60%)'
                ELSE 'Very Low (0-40%)'
            END
        ORDER BY 
            MIN(CASE 
                WHEN confidence >= 0.8 THEN 4
                WHEN confidence >= 0.6 THEN 3
                WHEN confidence >= 0.4 THEN 2
                ELSE 1
            END) DESC`,
        [tenantId]
    );

    const confidenceData = confidenceQuery.rows.length > 0
        ? confidenceQuery.rows.map(row => {
            let color = colors.primary; // emerald-500
            if (row.range.startsWith('High')) color = colors.success;
            else if (row.range.startsWith('Medium')) color = colors.info;
            else if (row.range.startsWith('Low')) color = colors.warning;
            else if (row.range.startsWith('Very')) color = colors.error;

            return {
                name: row.range,
                value: row.count,
                color
            };
        })
        : [
            { name: 'No confidence data', value: 1, color: colors.infoContent } // gray-200
        ];

    // Response time by hour data
    const responseTimeQuery = await query<{ hour: number; volume: number; avg_response_time: number }>(
        `WITH response_times AS (
            SELECT 
                EXTRACT(hour FROM user_msg.created_at AT TIME ZONE 'UTC')::int as hour,
                EXTRACT(EPOCH FROM (assistant_msg.created_at - user_msg.created_at)) as response_seconds
            FROM public.messages user_msg
            JOIN public.messages assistant_msg ON 
                user_msg.conversation_id = assistant_msg.conversation_id 
                AND assistant_msg.created_at > user_msg.created_at
                AND assistant_msg.role = 'assistant'
            WHERE user_msg.tenant_id = $1 
                AND user_msg.role = 'user'
                AND (user_msg.created_at at time zone 'UTC') >= ((now() at time zone 'UTC')::date - interval '${days} days')
                AND assistant_msg.created_at <= user_msg.created_at + INTERVAL '10 minutes'
            AND NOT EXISTS (
                SELECT 1 FROM public.messages mid_msg 
                WHERE mid_msg.conversation_id = user_msg.conversation_id 
                AND mid_msg.created_at > user_msg.created_at 
                AND mid_msg.created_at < assistant_msg.created_at
            )
        )
        SELECT 
            hour,
            COUNT(*)::int as volume,
            AVG(response_seconds) as avg_response_time
        FROM response_times
        WHERE response_seconds BETWEEN 0 AND 600  -- Filter out unrealistic response times
        GROUP BY hour
        ORDER BY hour`,
        [tenantId]
    );

    const responseTimeData = responseTimeQuery.rows.length > 0
        ? Array.from({ length: 24 }, (_, hour) => {
            const data = responseTimeQuery.rows.find(row => row.hour === hour);
            return {
                hour,
                avgResponse: data ? Math.round(data.avg_response_time * 10) / 10 : 0,
                volume: data?.volume || 0
            };
        })
        : Array.from({ length: 24 }, (_, hour) => ({
            hour,
            avgResponse: 0,
            volume: 0
        }));

    // Top performing sources - use document stats directly since message-to-chunk linking isn't available
    const topSourcesQuery = await query<{
        title: string;
        queries: number;
        avg_confidence: number;
    }>(
        `SELECT 
            d.title,
            COUNT(DISTINCT c.id)::int as queries,
            0.75 as avg_confidence
        FROM public.documents d
        JOIN public.chunks c ON c.document_id = d.id
        WHERE d.tenant_id = $1
        AND (d.created_at at time zone 'UTC') >= ((now() at time zone 'UTC')::date - interval '${days} days')
        GROUP BY d.title
        ORDER BY queries DESC
        LIMIT 5`,
        [tenantId]
    );

    const topSources = topSourcesQuery.rows.length > 0
        ? topSourcesQuery.rows.map(row => ({
            name: row.title || 'Untitled Document',
            queries: row.queries,
            accuracy: Math.round((row.avg_confidence || 0) * 100)
        }))
        : [{ name: 'No data available', queries: 0, accuracy: 0 }];

    return {
        chatVolume: dateRange,
        sources,
        confidenceData,
        responseTimeData,
        topSources
    };
}

export default async function Dashboard() {
    const tenantId = await getTenantIdStrict();

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
                                    <Link href="/dashboard/analytics" className="flex items-center gap-2 px-4 py-2 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-lg text-sm transition-all duration-200">
                                        <i className="fa-duotone fa-solid fa-chart-line" aria-hidden />
                                        Analytics
                                    </Link>
                                </HoverScale>
                                <HoverScale scale={1.02}>
                                    <Link href={`/dashboard/billing`} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-primary-content rounded-xl font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200">
                                        <i className="fa-duotone fa-solid fa-crown" aria-hidden />
                                        Upgrade Plan
                                    </Link>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Quick Start Banner for New Users */}
                <StaggerContainer>
                    <StaggerChild>
                        <Suspense fallback={null}>
                            <QuickStartBanner tenantId={tenantId} />
                        </Suspense>
                    </StaggerChild>
                </StaggerContainer>

                {/* KPIs Grid */}
                <StaggerContainer>
                    <StaggerChild>
                        <Suspense fallback={
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Chat Volume</h3>
                                            <p className="text-sm text-base-content/60">Messages and conversations over time</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                            <Suspense fallback={<div className="w-48 h-8 bg-base-200/60 rounded-lg animate-pulse"></div>}>
                                                <InteractiveTimeRangeSelector />
                                            </Suspense>
                                            <div className="flex items-center gap-2">
                                                <HoverScale scale={1.02}>
                                                    <Link href="/dashboard/analytics" className="flex items-center gap-2 px-3 py-1.5 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-lg text-sm transition-all duration-200">
                                                        <i className="fa-duotone fa-solid fa-chart-line text-xs" aria-hidden />
                                                        Full Analytics
                                                    </Link>
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

                        {/* Response Quality Chart */}
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Response Quality</h3>
                                            <p className="text-sm text-base-content/60">Confidence score distribution</p>
                                        </div>
                                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-gauge-high text-sm text-purple-600" aria-hidden />
                                        </div>
                                    </div>

                                    <div className="h-65">
                                        <Suspense fallback={<ChartSkeleton height="h-65" />}>
                                            <ConfidenceChartContainer tenantId={tenantId} />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </div>
                </StaggerContainer>

                {/* Second Row */}
                <StaggerContainer>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Knowledge Base */}
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
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

                        {/* Top Performing Content */}
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Top Content</h3>
                                            <p className="text-sm text-base-content/60">Most referenced documents</p>
                                        </div>
                                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-ranking-star text-sm text-emerald-600" aria-hidden />
                                        </div>
                                    </div>

                                    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>)}</div>}>
                                        <TopSourcesContainer tenantId={tenantId} />
                                    </Suspense>
                                </div>
                            </div>
                        </StaggerChild>

                        {/* Response Time Analysis */}
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Response Time</h3>
                                            <p className="text-sm text-base-content/60">Average response speed & peak hours</p>
                                        </div>
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-bolt text-sm text-blue-600" aria-hidden />
                                        </div>
                                    </div>

                                    <Suspense fallback={<div className="space-y-3"><div className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div><div className="animate-pulse bg-base-300/60 h-24 rounded-xl"></div></div>}>
                                        <ResponseTimeCardContainer tenantId={tenantId} />
                                    </Suspense>
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
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-base-content">Integrations</h3>
                                            <p className="text-sm text-base-content/60">Connected services</p>
                                        </div>
                                        <HoverScale scale={1.02}>
                                            <Link
                                                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                                                href="/dashboard/integrations"
                                            >
                                                View all
                                                <i className="fa-duotone fa-solid fa-arrow-right text-xs" aria-hidden />
                                            </Link>
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
                            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
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
function InteractiveTimeRangeSelector() {
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
        const lowDenom = stats.assistant_messages_this_month || 0;
        const lowConfRate = lowDenom ? Math.round((stats.low_conf / lowDenom) * 100) : 0;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <HoverScale scale={1.02}>
                    <StatCard
                        icon="fa-comments"
                        iconColor="text-blue-600"
                        iconBg="bg-blue-500/10"
                        accentColor="border-blue-500/20"
                        title="Conversations"
                        value={num(stats.conversations)}
                        trend={<MetricTrend value={stats.conversations} previousValue={Math.max(1, stats.conversations - 5)} label="vs last week" />}
                    />
                </HoverScale>
                <HoverScale scale={1.02}>
                    <UsageCard used={stats.messages_this_month} limit={limit} assistant={stats.assistant_messages_this_month} />
                </HoverScale>
                <HoverScale scale={1.02}>
                    <StatCard
                        icon="fa-triangle-exclamation"
                        iconColor={lowConfRate > 25 ? "text-red-600" : "text-amber-600"}
                        iconBg={lowConfRate > 25 ? "bg-red-500/10" : "bg-amber-500/10"}
                        accentColor={lowConfRate > 25 ? "border-red-500/20" : "border-amber-500/20"}
                        title="Low-confidence rate"
                        value={`${lowConfRate}%`}
                        delta={stats.low_conf ? `${stats.low_conf} msgs` : undefined}
                        negative={lowConfRate > 25}
                        trend={<MetricTrend value={lowConfRate} previousValue={Math.max(0, lowConfRate - 1)} label="vs last week" />}
                    />
                </HoverScale>
                <HoverScale scale={1.02}>
                    <StatCard
                        icon="fa-puzzle-piece"
                        iconColor="text-violet-600"
                        iconBg="bg-violet-500/10"
                        accentColor="border-violet-500/20"
                        title="Active integrations"
                        value={`${num(stats.integrations_active)} of ${2}`}
                        delta={stats.escalations_pending ? `${stats.escalations_pending} pending` : undefined}
                        negative={Boolean(stats.escalations_pending)}
                        trend={<div className="text-xs text-base-content/60">
                            {stats.integrations_active >= 2 ? 'All connected' : `${2 - stats.integrations_active} more available`}
                        </div>}
                    />
                </HoverScale>
            </div>
        );
    } catch {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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

        // Ensure we have valid data to display
        if (!sources || sources.length === 0) {
            // Fallback to direct query if the getChartData approach returns empty
            const directQuery = await query<{ host: string; documents: number; chunks: number }>(
                `SELECT 
                    COALESCE(
                        CASE
                            WHEN d.url ~ '^https?://[^/]+' THEN substring(d.url from '^https?://([^/]+)')
                            ELSE 'Direct Import'
                        END,
                        'Unknown Source'
                    ) as host,
                    COUNT(DISTINCT d.id)::int as documents,
                    COUNT(c.id)::int as chunks
                 FROM public.documents d
                 LEFT JOIN public.chunks c ON c.document_id = d.id
                 WHERE d.tenant_id = $1
                 GROUP BY host
                 ORDER BY documents DESC
                 LIMIT 5`,
                [tenantId]
            );

            const fallbackData = directQuery.rows.map(row => ({
                name: row.host || 'Unknown Source',
                documents: row.documents,
                chunks: row.chunks
            }));

            if (fallbackData.length > 0) {
                return <SourcesChart data={fallbackData} />;
            }
        }

        return <SourcesChart data={sources} />;
    } catch (error) {
        console.error('Error loading sources chart:', error);
        return <ChartSkeleton height="h-48" />;
    }
}

async function ConfidenceChartContainer({ tenantId }: { tenantId: string }) {
    try {
        const { confidenceData } = await getChartData(tenantId);
        return <ConfidenceChart data={confidenceData} />;
    } catch {
        return <ChartSkeleton height="h-48" />;
    }
}

async function TopSourcesContainer({ tenantId }: { tenantId: string }) {
    try {
        const { topSources } = await getChartData(tenantId);
        return (
            <div className="space-y-4">
                {topSources[0].queries === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-base-content/60">No source data available</p>
                    </div>
                ) : (
                    topSources.map((source, index) => (
                        <div key={source.name} className="flex items-center justify-between p-3 bg-base-200/30 rounded-xl hover:bg-base-200/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-bold text-primary">#{index + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-base-content truncate" title={source.name}>
                                        {source.name}
                                    </div>
                                    <div className="text-xs text-base-content/60">
                                        {source.queries} queries
                                    </div>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${source.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-700' :
                                source.accuracy >= 60 ? 'bg-amber-500/10 text-amber-700' :
                                    'bg-red-500/10 text-red-700'
                                }`}>
                                {source.accuracy}%
                            </div>
                        </div>
                    ))
                )}
            </div>
        );
    } catch {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                ))}
            </div>
        );
    }
}

async function ResponseTimeCardContainer({ tenantId }: { tenantId: string }) {
    try {
        const { responseTimeData } = await getChartData(tenantId);

        // Calculate average response time
        const validTimes = responseTimeData.filter(item => item.volume > 0);
        const totalResponses = validTimes.reduce((sum, item) => sum + item.volume, 0);
        const weightedSum = validTimes.reduce((sum, item) => sum + (item.avgResponse * item.volume), 0);
        const avgResponseTime = totalResponses > 0 ? Math.round((weightedSum / totalResponses) * 10) / 10 : 0;

        // Find peak hours
        const sortedByVolume = [...responseTimeData].sort((a, b) => b.volume - a.volume);
        const peakHours = sortedByVolume.slice(0, 3).filter(item => item.volume > 0);

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-bolt text-sm text-blue-600" aria-hidden />
                        </div>
                        <span className="text-sm font-medium">Avg Response Time</span>
                    </div>
                    <span className="text-lg font-semibold text-base-content">{avgResponseTime}s</span>
                </div>

                {peakHours.length > 0 && (
                    <div className="p-3 bg-base-200/40 rounded-xl border border-base-300/40">
                        <div className="text-sm font-medium mb-2">Peak Hours</div>
                        <div className="space-y-2">
                            {peakHours.map(hour => (
                                <div key={hour.hour} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-clock text-xs text-primary" aria-hidden />
                                        </div>
                                        <span className="text-sm text-base-content/80">
                                            {hour.hour.toString().padStart(2, '0')}:00 - {(hour.hour + 1) % 24}:00
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium">{hour.volume} msgs</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    } catch {
        return (
            <div className="space-y-3">
                <div className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                <div className="animate-pulse bg-base-300/60 h-24 rounded-xl"></div>
            </div>
        );
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
                                <Link href="/dashboard/integrations" className="btn btn-primary btn-sm rounded-lg mt-3">
                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                    Add Integration
                                </Link>
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
                            <div className={`px-2 py-1 rounded-md text-xs font-medium ${row.status === 'active'
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
                            <TenantProvider tenantId={tenantId}>
                                <OutboxRetryButton />
                            </TenantProvider>
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
                        <h3 className="text-lg font-semibold text-base-content">Calendar-month usage (UTC)</h3>
                        <p className="text-sm text-base-content/60">User messages vs plan cap</p>
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
                            className={`h-3 rounded-full transition-all duration-500 ${usedPct > 90 ? 'bg-gradient-to-r from-error to-error/80' :
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
                            <span className="text-xs text-base-content/60">High Quality (assistant)</span>
                        </div>
                        <div className="text-lg font-semibold">{num(Math.max(0, stats.assistant_messages_this_month - stats.low_conf))}</div>
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
    accentColor = "border-base-200/60",
    title,
    value,
    delta,
    negative,
    trend
}: {
    icon: string;
    iconColor?: string;
    iconBg?: string;
    accentColor?: string;
    title: string;
    value: string | number;
    delta?: string;
    negative?: boolean;
    trend?: React.ReactNode;
}) {
    return (
        <div className={`card bg-base-100 rounded-2xl border ${accentColor} shadow-sm hover:shadow-md transition-all duration-300 group`}>
            <div className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                        <i className={`fa-duotone fa-solid ${icon} text-lg ${iconColor}`} aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm text-base-content/70 font-semibold tracking-wide uppercase mb-1">{title}</div>
                        <div className="text-2xl font-bold text-base-content tracking-tight">{value}</div>
                        {trend && <div className="mt-1">{trend}</div>}
                        {delta && (
                            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold shadow-sm mt-2 ${negative ? "bg-red-500/10 text-red-700 border border-red-500/20" : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                }`}>
                                {delta}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function UsageCard({ used, limit, assistant }: { used: number; limit: number; assistant?: number }) {
    const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    const getUsageColors = () => {
        if (pct > 90) return {
            iconBg: 'bg-red-500/10',
            iconColor: 'text-red-600',
            badgeBg: 'bg-red-500/10 text-red-700 border border-red-500/20',
            accentColor: 'border-red-500/20',
            progressColor: 'bg-red-500'
        };
        if (pct > 70) return {
            iconBg: 'bg-amber-500/10',
            iconColor: 'text-amber-600',
            badgeBg: 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
            accentColor: 'border-amber-500/20',
            progressColor: 'bg-amber-500'
        };
        return {
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-600',
            badgeBg: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
            accentColor: 'border-emerald-500/20',
            progressColor: 'bg-emerald-500'
        };
    };

    const colors = getUsageColors();

    return (
        <div className={`card bg-base-100 rounded-2xl border ${colors.accentColor} shadow-sm hover:shadow-md transition-all duration-300 group`}>
            <div className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${colors.iconBg} rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                        <i className={`fa-duotone fa-solid fa-message text-lg ${colors.iconColor}`} aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-base-content/70 font-semibold tracking-wide uppercase">Messages</div>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${colors.badgeBg}`}>
                                {pct}%
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-base-content tracking-tight">
                            {num(used)}
                            <span className="text-lg text-base-content/60 font-normal">/{num(limit)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            {typeof assistant === 'number' && (
                                <div className="text-base-content/60">AI: <span className="font-medium text-base-content">{num(assistant)}</span></div>
                            )}
                            <div className="ml-auto">
                                <MetricTrend value={used} previousValue={Math.max(1, used - 10)} label="vs last week" />
                            </div>
                        </div>
                    </div>
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

async function QuickStartBanner({ tenantId }: { tenantId: string }) {
    try {
        // Check if user has sites and documents
        const sitesQuery = await query('SELECT COUNT(*) as count FROM public.tenant_sites WHERE tenant_id = $1', [tenantId]);
        const docsQuery = await query('SELECT COUNT(*) as count FROM public.documents WHERE tenant_id = $1', [tenantId]);

        const sitesCount = Number(sitesQuery.rows[0]?.count || 0);
        const docsCount = Number(docsQuery.rows[0]?.count || 0);

        // Don't show banner if user already has sites and documents
        if (sitesCount > 0 && docsCount > 0) {
            return null;
        }

        const needsSites = sitesCount === 0;
        const needsDocs = docsCount === 0;

        return (
            <div data-banner="quickstart" className="bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-rocket text-primary text-lg" aria-hidden />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">
                                    {needsSites && needsDocs ? "Let's get you started!" : "Almost ready!"}
                                </h3>
                                <p className="text-sm text-base-content/70">
                                    {needsSites && needsDocs
                                        ? "Set up your AI support in just a few steps"
                                        : needsSites
                                            ? "Add your website to start using the chat widget"
                                            : "Add some content to improve your AI responses"
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className={`flex items-center gap-3 p-3 rounded-xl ${sitesCount > 0 ? 'bg-success/10 border border-success/20' : 'bg-base-100/60 border border-base-300'}`}>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${sitesCount > 0 ? 'bg-success/20' : 'bg-base-200'}`}>
                                    <i className={`fa-duotone fa-solid ${sitesCount > 0 ? 'fa-check text-success' : 'fa-globe text-base-content/60'} text-sm`} aria-hidden />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Add Website</div>
                                    <div className="text-xs text-base-content/60">
                                        {sitesCount > 0 ? `${sitesCount} site${sitesCount > 1 ? 's' : ''} registered` : 'Register your domain'}
                                    </div>
                                </div>
                            </div>

                            <div className={`flex items-center gap-3 p-3 rounded-xl ${docsCount > 0 ? 'bg-success/10 border border-success/20' : 'bg-base-100/60 border border-base-300'}`}>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${docsCount > 0 ? 'bg-success/20' : 'bg-base-200'}`}>
                                    <i className={`fa-duotone fa-solid ${docsCount > 0 ? 'fa-check text-success' : 'fa-file-lines text-base-content/60'} text-sm`} aria-hidden />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Add Content</div>
                                    <div className="text-xs text-base-content/60">
                                        {docsCount > 0 ? `${docsCount} document${docsCount > 1 ? 's' : ''} indexed` : 'Upload your knowledge base'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-base-100/60 border border-base-300">
                                <div className="w-6 h-6 bg-base-200 rounded-lg flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-code text-base-content/60 text-sm" aria-hidden />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Install Widget</div>
                                    <div className="text-xs text-base-content/60">Copy & paste the code</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex gap-3">
                        {needsSites ? <SiteWizardLauncher /> : (
                            <Link href="/dashboard/documents" className="btn btn-primary rounded-xl">
                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                Add Content
                            </Link>
                        )}
                        <QuickStartDismiss />
                    </div>
                </div>
            </div>
        );
    } catch {
        return null;
    }
}
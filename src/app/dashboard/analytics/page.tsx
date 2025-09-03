import { Suspense } from "react";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { ConversationTrendsChart, ConfidenceAnalysisChart, ResponseTimeChart } from "./analytics-charts";
import { IntegrationHealthDashboard } from "@/components/analytics/integration-health-dashboard";
import { ExportControls } from "@/components/analytics/export-controls";
import StatCard from "@/components/ui/stat-card";

export const runtime = 'nodejs'

type AnalyticsData = {
    totalMessages: number;
    totalConversations: number;
    avgConfidence: number;
    escalationRate: number;
    avgResponseTime: number;
    activeIntegrations: number;
    messagesGrowth: number;
    conversationsGrowth: number;
    confidenceGrowth: number;
    escalationGrowth: number;
    responseTimeGrowth: number;
    integrationsGrowth: number;
    conversationsByDay: ConversationTrendsData[];
    confidenceDistribution: ConfidenceDistributionData[];
    responseTimeByHour: ResponseTimeData[];
    topSources: TopSourcesData[];
};

type ConversationTrendsData = {
    date: string;
    conversations: number;
    messages: number;
    escalations: number;
};

type ConfidenceDistributionData = {
    range: string;
    count: number;
    percentage: number;
};

type ResponseTimeData = {
    hour: number;
    avgResponse: number;
    volume: number;
};

type TopSourcesData = {
    source: string;
    queries: number;
    accuracy: number;
};

async function getAnalyticsData(tenantId: string): Promise<AnalyticsData> {
    // Current period stats
    const currentStatsQuery = await query<{
        total_messages: number;
        total_conversations: number;
        avg_confidence: number;
        total_escalations: number;
        active_integrations: number;
    }>(`
        SELECT 
            COUNT(CASE WHEN role = 'user' THEN 1 END)::int as total_messages,
            COUNT(DISTINCT conversation_id)::int as total_conversations,
            AVG(CASE WHEN confidence IS NOT NULL THEN confidence ELSE 0 END) as avg_confidence,
            (SELECT COUNT(*)::int FROM public.escalations WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days') as total_escalations,
            (SELECT COUNT(*)::int FROM public.integrations WHERE tenant_id = $1 AND status = 'active') as active_integrations
        FROM public.messages 
        WHERE tenant_id = $1 
        AND created_at >= NOW() - INTERVAL '30 days'
    `, [tenantId]);

    // Previous period stats for growth calculation
    const previousStatsQuery = await query<{
        prev_messages: number;
        prev_conversations: number;
        prev_confidence: number;
        prev_escalations: number;
    }>(`
        SELECT 
            COUNT(CASE WHEN role = 'user' THEN 1 END)::int as prev_messages,
            COUNT(DISTINCT conversation_id)::int as prev_conversations,
            AVG(CASE WHEN confidence IS NOT NULL THEN confidence ELSE 0 END) as prev_confidence,
            (SELECT COUNT(*)::int FROM public.escalations WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as prev_escalations
        FROM public.messages 
        WHERE tenant_id = $1 
        AND created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days'
    `, [tenantId]);

    // Conversation trends over time
    const conversationTrendsQuery = await query<{
        date: string;
        conversations: number;
        messages: number;
        escalations: number;
    }>(`
        WITH daily_messages AS (
            SELECT 
                date_trunc('day', created_at)::date as date,
                COUNT(DISTINCT conversation_id)::int as conversations,
                COUNT(CASE WHEN role = 'user' THEN 1 END)::int as messages
            FROM public.messages 
            WHERE tenant_id = $1 
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY date_trunc('day', created_at)::date
        ),
        daily_escalations AS (
            SELECT 
                date_trunc('day', created_at)::date as date,
                COUNT(*)::int as escalations
            FROM public.escalations 
            WHERE tenant_id = $1 
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY date_trunc('day', created_at)::date
        )
        SELECT 
            dm.date::text as date,
            COALESCE(dm.conversations, 0) as conversations,
            COALESCE(dm.messages, 0) as messages,
            COALESCE(de.escalations, 0) as escalations
        FROM daily_messages dm
        LEFT JOIN daily_escalations de ON dm.date = de.date
        ORDER BY dm.date
    `, [tenantId]);

    // Confidence score distribution
    const confidenceQuery = await query<{
        range: string;
        count: number;
    }>(`
        SELECT 
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
        AND created_at >= NOW() - INTERVAL '30 days'
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
            END) DESC
    `, [tenantId]);

    // Response time by hour (calculate actual response times from conversation pairs)
    const responseTimeQuery = await query<{
        hour: number;
        volume: number;
        avg_response_time: number;
    }>(`
        WITH response_times AS (
            SELECT 
                EXTRACT(hour FROM user_msg.created_at)::int as hour,
                EXTRACT(EPOCH FROM (assistant_msg.created_at - user_msg.created_at)) as response_seconds
            FROM public.messages user_msg
            JOIN public.messages assistant_msg ON 
                user_msg.conversation_id = assistant_msg.conversation_id 
                AND assistant_msg.created_at > user_msg.created_at
                AND assistant_msg.role = 'assistant'
            WHERE user_msg.tenant_id = $1 
                AND user_msg.role = 'user'
                AND user_msg.created_at >= NOW() - INTERVAL '7 days'
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
        ORDER BY hour
    `, [tenantId]);

    // Top performing sources
    const sourcesQuery = await query<{
        source: string;
        queries: number;
        avg_confidence: number;
    }>(`
        SELECT 
            d.title as source,
            COUNT(m.id)::int as queries,
            AVG(m.confidence) as avg_confidence
        FROM public.messages m
        JOIN public.documents d ON d.tenant_id = m.tenant_id
        WHERE m.tenant_id = $1 
        AND m.confidence IS NOT NULL
        AND m.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY d.id, d.title
        ORDER BY queries DESC
        LIMIT 10
    `, [tenantId]);

    // Calculate trends (comparing current vs previous period)
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const currData = currentStatsQuery.rows[0] || {
        total_messages: 0,
        total_conversations: 0,
        avg_confidence: 0,
        total_escalations: 0,
        active_integrations: 0
    };

    const prevData = previousStatsQuery.rows[0] || {
        prev_messages: 0,
        prev_conversations: 0,
        prev_confidence: 0,
        prev_escalations: 0
    };

    // Process conversation trends data to fill gaps
    const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date.toISOString().split('T')[0];
    });

    const conversationsByDay = last30Days.map(date => {
        const data = conversationTrendsQuery.rows.find(row => row.date === date);
        return {
            date,
            conversations: data?.conversations || 0,
            messages: data?.messages || 0,
            escalations: data?.escalations || 0
        };
    });

    // Process confidence distribution
    const totalConfidenceRecords = confidenceQuery.rows.reduce((sum, row) => sum + row.count, 0);
    const confidenceDistribution = confidenceQuery.rows.map(row => ({
        range: row.range,
        count: row.count,
        percentage: totalConfidenceRecords > 0 ? Math.round((row.count / totalConfidenceRecords) * 100) : 0
    }));

    // Process response time data with actual calculated response times
    const responseTimeByHour = Array.from({ length: 24 }, (_, hour) => {
        const data = responseTimeQuery.rows.find(row => row.hour === hour);
        const volume = data?.volume || 0;
        const avgResponse = volume > 0 ? (data?.avg_response_time || 0) : 0;

        return {
            hour,
            avgResponse: Math.round(avgResponse * 10) / 10, // Round to 1 decimal
            volume
        };
    });

    // Process top sources data
    const topSources = sourcesQuery.rows.map(row => ({
        source: row.source || 'Unknown Source',
        queries: row.queries,
        accuracy: Math.round((row.avg_confidence || 0) * 100)
    }));

    // Calculate escalation rate and average response time from real data
    const escalationRate = currData.total_conversations > 0
        ? Math.round((currData.total_escalations / currData.total_conversations) * 100)
        : 0;
    console.log('Escalation Rate:', escalationRate, 'Curr Escalations:', currData.total_escalations, 'Curr Conversations:', currData.total_conversations);
    const prevEscalationRate = prevData.prev_conversations > 0
        ? Math.round((prevData.prev_escalations / prevData.prev_conversations) * 100)
        : 0;

    // Calculate average response time from response time data
    const totalVolumeForResponseTime = responseTimeByHour.reduce((sum, hour) => sum + hour.volume, 0);
    const weightedResponseTime = responseTimeByHour.reduce((sum, hour) => {
        return sum + (hour.avgResponse * hour.volume);
    }, 0);
    const avgResponseTime = totalVolumeForResponseTime > 0
        ? Math.round((weightedResponseTime / totalVolumeForResponseTime) * 10) / 10
        : 0;

    // Calculate previous period response time for growth
    const { rows: prevResponseTimeRows } = await query<{ avg_response_time: number }>(`
        WITH response_times AS (
            SELECT EXTRACT(EPOCH FROM (assistant_msg.created_at - user_msg.created_at)) as response_seconds
            FROM public.messages user_msg
            JOIN public.messages assistant_msg ON 
                user_msg.conversation_id = assistant_msg.conversation_id 
                AND assistant_msg.created_at > user_msg.created_at
                AND assistant_msg.role = 'assistant'
            WHERE user_msg.tenant_id = $1 
                AND user_msg.role = 'user'
                AND user_msg.created_at >= NOW() - INTERVAL '60 days'
                AND user_msg.created_at < NOW() - INTERVAL '30 days'
                AND assistant_msg.created_at <= user_msg.created_at + INTERVAL '10 minutes'
            AND NOT EXISTS (
                SELECT 1 FROM public.messages mid_msg 
                WHERE mid_msg.conversation_id = user_msg.conversation_id 
                AND mid_msg.created_at > user_msg.created_at 
                AND mid_msg.created_at < assistant_msg.created_at
            )
        )
        SELECT AVG(response_seconds) as avg_response_time
        FROM response_times
        WHERE response_seconds BETWEEN 0 AND 600
    `, [tenantId]);

    const prevAvgResponseTime = prevResponseTimeRows[0]?.avg_response_time || 0;

    return {
        totalMessages: currData.total_messages,
        totalConversations: currData.total_conversations,
        avgConfidence: Math.round((currData.avg_confidence || 0) * 100),
        escalationRate,
        avgResponseTime,
        activeIntegrations: currData.active_integrations,
        messagesGrowth: calculateGrowth(currData.total_messages, prevData.prev_messages),
        conversationsGrowth: calculateGrowth(currData.total_conversations, prevData.prev_conversations),
        confidenceGrowth: calculateGrowth(
            (currData.avg_confidence || 0) * 100,
            (prevData.prev_confidence || 0) * 100
        ),
        escalationGrowth: calculateGrowth(escalationRate, prevEscalationRate),
        responseTimeGrowth: calculateGrowth(avgResponseTime, prevAvgResponseTime),
        integrationsGrowth: 0, // Assuming stable integration count
        conversationsByDay,
        confidenceDistribution,
        responseTimeByHour,
        topSources
    };
}

export default async function AnalyticsPage() {
    const tenantId = await getTenantIdStrict();

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Analytics", icon: "fa-chart-line" }
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content tracking-tight">Analytics</h1>
                                <p className="text-base-content/60 mt-2">Comprehensive insights into your AI support performance</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <HoverScale scale={1.02}>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-base-200/60 hover:bg-base-200 border border-base-300/40 rounded-lg text-sm transition-all duration-200">
                                        <i className="fa-duotone fa-solid fa-download text-xs" aria-hidden />
                                        Export Report
                                    </button>
                                </HoverScale>
                                <HoverScale scale={1.02}>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-content rounded-lg text-sm font-medium shadow-sm transition-all duration-200">
                                        <i className="fa-duotone fa-solid fa-calendar text-xs" aria-hidden />
                                        Last 30 Days
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <Suspense fallback={<AnalyticsSkeleton />}>
                    <AnalyticsContent tenantId={tenantId} />
                </Suspense>
            </div>
        </AnimatedPage>
    );
}

async function AnalyticsContent({ tenantId }: { tenantId: string }) {
    const data = await getAnalyticsData(tenantId);

    return (
        <div className="space-y-8">
            {/* Overview Metrics */}
            <div>
                <AnalyticsOverview data={data} />
            </div>

            {/* Export Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <StaggerChild>
                        <IntegrationHealthDashboard />
                    </StaggerChild>
                </div>
                <ExportControls />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <StaggerChild>
                    <ConversationTrendsCard data={data.conversationsByDay} />
                </StaggerChild>
                <StaggerChild>
                    <ConfidenceAnalysisCard data={data.confidenceDistribution} />
                </StaggerChild>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <StaggerChild>
                        <ResponseTimeCard data={data.responseTimeByHour} />
                    </StaggerChild>
                </div>
                <div>
                    <StaggerChild>
                        <TopSourcesCard data={data.topSources} />
                    </StaggerChild>
                </div>
            </div>
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-8">
            {/* Overview metrics skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {Array.from({ length: 6 }, (_, i) => <StatCardSkeleton key={i} />)}
            </div>

            {/* Charts skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ChartSkeleton />
                <ChartSkeleton />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <ChartSkeleton />
                </div>
                <ChartSkeleton />
            </div>
        </div>
    );
}

function AnalyticsOverview({ data }: { data: AnalyticsData }) {
    const metrics: Array<{
        label: string;
        value: string;
        trend: number;
        icon: string;
        color: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
    }> = [
            {
                label: "Total Messages",
                value: data.totalMessages.toLocaleString(),
                trend: data.messagesGrowth,
                icon: "fa-messages",
                color: "success"
            },
            {
                label: "Conversations",
                value: data.totalConversations.toLocaleString(),
                trend: data.conversationsGrowth,
                icon: "fa-comments",
                color: "primary"
            },
            {
                label: "Avg Confidence",
                value: `${data.avgConfidence}%`,
                trend: data.confidenceGrowth,
                icon: "fa-gauge-high",
                color: "secondary"
            },
            {
                label: "Escalation Rate",
                value: `${data.escalationRate}%`,
                trend: data.escalationGrowth,
                icon: "fa-triangle-exclamation",
                color: "warning"
            },
            {
                label: "Response Time",
                value: `${data.avgResponseTime}s`,
                trend: data.responseTimeGrowth,
                icon: "fa-clock",
                color: "accent"
            },
            {
                label: "Active Integrations",
                value: data.activeIntegrations.toString(),
                trend: data.integrationsGrowth,
                icon: "fa-puzzle-piece",
                color: "info"
            }
        ];

    return (
        <StaggerContainer>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map((metric) => (
                    <StaggerChild key={metric.label}>
                        <HoverScale scale={1.02}>
                            <StatCard
                                title={metric.label}
                                value={metric.value}
                                icon={metric.icon}
                                color={metric.color}
                                description={
                                    <div className={`flex items-center gap-1 text-xs mt-1 ${metric.trend > 0 ? 'text-emerald-600' :
                                        metric.trend < 0 ? 'text-red-600' : 'text-base-content/60'
                                        }`}>
                                        {metric.trend > 0 && <i className="fa-duotone fa-solid fa-arrow-trend-up" aria-hidden />}
                                        {metric.trend < 0 && <i className="fa-duotone fa-solid fa-arrow-trend-down" aria-hidden />}
                                        {metric.trend === 0 && <i className="fa-duotone fa-solid fa-minus" aria-hidden />}
                                        <span className="font-semibold">{Math.abs(metric.trend).toFixed(1)}%</span>
                                    </div>
                                }
                            />
                        </HoverScale>
                    </StaggerChild>
                ))}
            </div>
        </StaggerContainer>
    );
}

function ConversationTrendsCard({ data }: { data: ConversationTrendsData[] }) {
    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-base-content">Conversation Trends</h3>
                        <p className="text-sm text-base-content/60">Daily conversations, messages, and escalations</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-chart-line text-lg text-blue-600" aria-hidden />
                    </div>
                </div>
                <ConversationTrendsChart data={data} />
            </div>
        </div>
    );
}

function ConfidenceAnalysisCard({ data }: { data: ConfidenceDistributionData[] }) {
    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-base-content">Confidence Analysis</h3>
                        <p className="text-sm text-base-content/60">Distribution of AI response confidence scores</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-chart-pie text-lg text-purple-600" aria-hidden />
                    </div>
                </div>
                <ConfidenceAnalysisChart data={data} />
            </div>
        </div>
    );
}

function ResponseTimeCard({ data }: { data: ResponseTimeData[] }) {
    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-base-content">Response Time Analysis</h3>
                        <p className="text-sm text-base-content/60">Average response times throughout the day</p>
                    </div>
                    <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-clock text-lg text-teal-600" aria-hidden />
                    </div>
                </div>
                <ResponseTimeChart data={data} />
            </div>
        </div>
    );
}

function TopSourcesCard({ data }: { data: TopSourcesData[] }) {
    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-base-content">Top Knowledge Sources</h3>
                        <p className="text-sm text-base-content/60">Most queried content sources</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-ranking-star text-lg text-orange-600" aria-hidden />
                    </div>
                </div>

                {data.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <i className="fa-duotone fa-solid fa-database text-lg text-base-content/40" aria-hidden />
                        </div>
                        <p className="text-sm text-base-content/60">No source data available</p>
                        <p className="text-xs text-base-content/40 mt-1">Ingest some documents to see analytics</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.slice(0, 5).map((source, index) => (
                            <div key={source.source} className="flex items-center justify-between p-3 bg-base-200/30 rounded-xl hover:bg-base-200/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-primary">#{index + 1}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-sm text-base-content truncate" title={source.source}>
                                            {source.source}
                                        </div>
                                        <div className="text-xs text-base-content/60">
                                            {source.queries} queries
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${source.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                                    source.accuracy >= 60 ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20' :
                                        'bg-red-500/10 text-red-700 border border-red-500/20'
                                    }`}>
                                    {source.accuracy}%
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

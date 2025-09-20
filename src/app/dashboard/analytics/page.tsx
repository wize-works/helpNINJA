import { Suspense } from "react";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { ConversationTrendsChart, ConfidenceAnalysisChart, ResponseTimeChart } from "./analytics-charts";
import { IntegrationHealthDashboard } from "@/components/analytics/integration-health-dashboard";
import { ExportControls } from "@/components/analytics/export-controls";
import { TopQuestionsExportButton } from "@/components/analytics/top-questions-export";
import FilterControls from "./filter-controls";
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

type TopQuestionRow = {
    normalized_text: string;
    count: number;
    avg_confidence: number | null;
    low_conf_count: number;
    example_conversation_id: string | null;
    example_text: string | null;
};

type TopQuestion = {
    question: string;
    count: number;
    avgConfidence: number;
    lowConfidenceCount: number;
    exampleConversationId?: string;
    normalized: string;
};

async function getAnalyticsData(tenantId: string, opts: { days: number; siteId?: string | null }): Promise<AnalyticsData> {
    const { days, siteId } = opts;
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
            (SELECT COUNT(*)::int FROM public.escalations WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::interval ${siteId ? ' AND site_id = $3' : ''}) as total_escalations,
            (SELECT COUNT(*)::int FROM public.integrations WHERE tenant_id = $1 AND status = 'active') as active_integrations
        FROM public.messages 
        WHERE tenant_id = $1 
        AND created_at >= NOW() - ($2 || ' days')::interval
        ${siteId ? ' AND site_id = $3' : ''}
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);

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
            (SELECT COUNT(*)::int FROM public.escalations WHERE tenant_id = $1 AND created_at >= NOW() - ($2 * 2 || ' days')::interval AND created_at < NOW() - ($2 || ' days')::interval ${siteId ? ' AND site_id = $3' : ''}) as prev_escalations
        FROM public.messages 
        WHERE tenant_id = $1 
        AND created_at >= NOW() - ($2 * 2 || ' days')::interval
        AND created_at < NOW() - ($2 || ' days')::interval
        ${siteId ? ' AND site_id = $3' : ''}
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);

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
            AND created_at >= NOW() - ($2 || ' days')::interval
            ${siteId ? ' AND site_id = $3' : ''}
            GROUP BY date_trunc('day', created_at)::date
        ),
        daily_escalations AS (
            SELECT 
                date_trunc('day', created_at)::date as date,
                COUNT(*)::int as escalations
            FROM public.escalations 
            WHERE tenant_id = $1 
            AND created_at >= NOW() - ($2 || ' days')::interval
            ${siteId ? ' AND site_id = $3' : ''}
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
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);

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
        AND created_at >= NOW() - ($2 || ' days')::interval
        ${siteId ? ' AND site_id = $3' : ''}
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
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);

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
                AND user_msg.created_at >= NOW() - (LEAST($2, 7) || ' days')::interval
                AND assistant_msg.created_at <= user_msg.created_at + INTERVAL '10 minutes'
                ${siteId ? ' AND user_msg.site_id = $3' : ''}
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
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);

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
        AND m.created_at >= NOW() - ($2 || ' days')::interval
        ${siteId ? ' AND m.site_id = $3' : ''}
        GROUP BY d.id, d.title
        ORDER BY queries DESC
        LIMIT 10
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);


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
    const lastDays = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return date.toISOString().split('T')[0];
    });

    const conversationsByDay = lastDays.map(date => {
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

    // Note: Questions insights are rendered separately in TopQuestionsSection

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
                AND user_msg.created_at >= NOW() - ($2 * 2 || ' days')::interval
                AND user_msg.created_at < NOW() - ($2 || ' days')::interval
                AND assistant_msg.created_at <= user_msg.created_at + INTERVAL '10 minutes'
                ${siteId ? ' AND user_msg.site_id = $3' : ''}
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
    `, siteId ? [tenantId, days, siteId] : [tenantId, days]);

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

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<{ range?: string; siteId?: string }> }) {
    const tenantId = await getTenantIdStrict();
    const params = (await searchParams) ?? {};
    const range = (params.range as '7d' | '30d' | '90d' | 'all') || '30d'
    const days = range === '7d' ? 7 : range === '90d' ? 90 : range === 'all' ? 365 : 30
    const siteId = params.siteId || null
    let siteLabel: string | null = null;
    if (siteId) {
        try {
            const { rows } = await query<{ domain: string | null; name: string | null }>(
                `select domain, name from public.tenant_sites where id = $1 and tenant_id = $2 limit 1`,
                [siteId, tenantId]
            );
            siteLabel = rows[0]?.domain || rows[0]?.name || siteId;
        } catch {
            siteLabel = siteId;
        }
    }

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
                                {/* Active filter chips */}
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span className="text-xs text-base-content/50">Filtered by</span>
                                    <span className="badge badge-sm badge-outline">
                                        {range === 'all' ? 'All time (cap 365d)' : (range === '7d' ? 'Last 7 days' : range === '90d' ? 'Last 90 days' : 'Last 30 days')}
                                    </span>
                                    {siteId && (
                                        <span className="badge badge-sm badge-outline">Site: {siteLabel}</span>
                                    )}
                                    <a href={`/dashboard/conversations?${new URLSearchParams({ ...(siteId ? { site: siteId } : {}), range: range === 'all' ? '30d' : (range as '7d' | '30d' | '90d') }).toString()}`}
                                        className="link text-xs">
                                        Browse conversations
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <FilterControls filters={{ range, siteId: siteId || undefined }} />
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <Suspense fallback={<AnalyticsSkeleton />}>
                    <AnalyticsContent tenantId={tenantId} days={days} siteId={siteId} range={range} />
                </Suspense>
            </div>
        </AnimatedPage>
    );
}

async function AnalyticsContent({ tenantId, days, siteId, range }: { tenantId: string; days: number; siteId: string | null; range: '7d' | '30d' | '90d' | 'all' }) {
    const data = await getAnalyticsData(tenantId, { days, siteId });

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

            {/* Questions Insights */}
            <TopQuestionsSection tenantId={tenantId} days={days} siteId={siteId} range={range} />
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

// Server component section to fetch and render Top Questions and Low-Confidence Questions
async function TopQuestionsSection({ tenantId, days, siteId, range }: { tenantId: string; days: number; siteId: string | null; range: '7d' | '30d' | '90d' | 'all' }) {
    // Reuse the same SQL used in getAnalyticsData to avoid drift
    const topQuestionsSql = `
        WITH user_msgs AS (
            SELECT 
                m.id,
                m.conversation_id,
                lower(trim(regexp_replace(m.content, '[[:space:]]+', ' ', 'g'))) AS normalized_text,
                m.content,
                m.created_at
            FROM public.messages m
            WHERE m.tenant_id = $1
              AND m.role = 'user'
              AND m.created_at >= NOW() - ($2 || ' days')::interval
              ${siteId ? ' AND m.site_id = $3' : ''}
              AND length(m.content) >= 5
        ), paired AS (
            SELECT 
                u.normalized_text,
                u.content,
                u.conversation_id,
                a.confidence AS assistant_confidence
            FROM user_msgs u
            LEFT JOIN LATERAL (
                SELECT confidence
                FROM public.messages a
                WHERE a.conversation_id = u.conversation_id
                  AND a.created_at > u.created_at
                  AND a.role = 'assistant'
                ORDER BY a.created_at ASC
                LIMIT 1
            ) a ON true
        )
        SELECT 
            normalized_text,
            COUNT(*)::int AS count,
            AVG(assistant_confidence) AS avg_confidence,
            SUM(CASE WHEN assistant_confidence IS NOT NULL AND assistant_confidence < 0.55 THEN 1 ELSE 0 END)::int AS low_conf_count,
            MIN(conversation_id::text) AS example_conversation_id,
            MIN(content) AS example_text
        FROM paired
        GROUP BY normalized_text
        HAVING COUNT(*) >= 2
        ORDER BY count DESC
        LIMIT 100`;

    const { rows } = await query<TopQuestionRow>(topQuestionsSql, siteId ? [tenantId, days, siteId] : [tenantId, days]);

    const redact = (s: string | null) => {
        if (!s) return '';
        let t = s;
        t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
        t = t.replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]');
        return t.slice(0, 140);
    };

    const items: TopQuestion[] = rows.map(r => ({
        question: redact(r.example_text) || r.normalized_text,
        count: r.count,
        avgConfidence: Math.round(((r.avg_confidence || 0) * 100)),
        lowConfidenceCount: r.low_conf_count,
        exampleConversationId: r.example_conversation_id || undefined,
        normalized: r.normalized_text
    }));

    const top = items.slice(0, 10);
    const lowConf = items.filter(i => i.lowConfidenceCount > 0).sort((a, b) => b.lowConfidenceCount - a.lowConfidenceCount).slice(0, 10);

    const subtitleFor = (kind: 'top' | 'low') => {
        const rangeLabel = range === 'all' ? 'All time (capped)' : (range === '7d' ? 'Last 7 days' : range === '90d' ? 'Last 90 days' : 'Last 30 days')
        return kind === 'top' ? `Most frequent user questions • ${rangeLabel}` : `Questions often answered with low confidence • ${rangeLabel}`
    }
    const searchBase = new URLSearchParams({ ...(siteId ? { site: siteId } : {}), range: range === 'all' ? '30d' : range }).toString()

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <TopQuestionsCard title="Top Questions" subtitle={subtitleFor('top')} items={top} searchBase={searchBase} />
            <TopQuestionsCard title="Low-Confidence Questions" subtitle={subtitleFor('low')} items={lowConf} searchBase={searchBase} highlightLowConfidence />
        </div>
    );
}

function TopQuestionsCard({ title, subtitle, items, searchBase, highlightLowConfidence = false }: { title: string; subtitle: string; items: TopQuestion[]; searchBase: string; highlightLowConfidence?: boolean }) {
    return (
        <div className="flex flex-col gap-4">
            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-base-content">{title}</h3>
                            <p className="text-sm text-base-content/60">{subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <TopQuestionsExportButton items={items} filename={title.toLowerCase().replace(/\s+/g, '-')} />
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-clipboard-question text-lg text-amber-600" aria-hidden />
                            </div>
                        </div>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <i className="fa-duotone fa-solid fa-comments-question text-lg text-base-content/40" aria-hidden />
                            </div>
                            <p className="text-sm text-base-content/60">No question insights yet</p>
                            <p className="text-xs text-base-content/40 mt-1">As users ask more questions, insights will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((q, index) => (
                                <div key={`${q.question}-${index}`} className="p-3 bg-base-200/30 rounded-xl hover:bg-base-200/50 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm text-base-content truncate" title={q.question}>
                                                {q.question}
                                            </div>
                                            <div className="text-xs text-base-content/60 mt-0.5 flex items-center gap-3">
                                                <span className="inline-flex items-center gap-1"><i className="fa-duotone fa-solid fa-hashtag text-xs" aria-hidden /> {q.count}</span>
                                                <span className="inline-flex items-center gap-1"><i className="fa-duotone fa-solid fa-gauge-high text-xs" aria-hidden /> {q.avgConfidence}%</span>
                                                {highlightLowConfidence && (
                                                    <span className={`inline-flex items-center gap-1 ${q.lowConfidenceCount > 0 ? 'text-amber-700' : 'text-base-content/60'}`}>
                                                        <i className="fa-duotone fa-solid fa-triangle-exclamation text-xs" aria-hidden /> {q.lowConfidenceCount} low-conf
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={`/dashboard/conversations?${searchBase}&q=${encodeURIComponent(q.normalized)}`} className="btn btn-xs  rounded-lg">
                                                Find all
                                            </a>
                                            {q.exampleConversationId && (
                                                <a href={`/dashboard/conversations/${q.exampleConversationId}`} className="btn btn-xs rounded-lg">
                                                    View
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
        <div className="flex flex-col gap-4">
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
        </div>
    );
}

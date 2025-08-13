import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        // Get tenant ID from headers
        const tenantId = request.headers.get('x-tenant-id');
        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
        }

        // Get query parameters
        const url = new URL(request.url);
        const site = url.searchParams.get('site');
        const timeframe = url.searchParams.get('timeframe') || '30d';

        // Convert timeframe to days
        const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : 30;

        // Build site filter condition
        let siteFilter = '';
        let siteParams: string[] = [];
        if (site) {
            siteFilter = ' AND EXISTS (SELECT 1 FROM public.sites s WHERE s.tenant_id = $1 AND s.id = $2 AND m.conversation_id LIKE CONCAT(s.id, \'%\'))';
            siteParams = [site];
        }

        // Current period stats
        const currentStatsQuery = await query<{
            total_messages: number;
            total_conversations: number;
            avg_confidence: number;
            escalation_rate: number;
            active_integrations: number;
        }>(`
            SELECT 
                COUNT(CASE WHEN role = 'user' THEN 1 END)::int as total_messages,
                COUNT(DISTINCT conversation_id)::int as total_conversations,
                AVG(CASE WHEN confidence IS NOT NULL THEN confidence ELSE 0 END) as avg_confidence,
                (COUNT(CASE WHEN confidence < 0.55 THEN 1 END)::float / NULLIF(COUNT(CASE WHEN role = 'assistant' THEN 1 END), 0)) * 100 as escalation_rate,
                (SELECT COUNT(*)::int FROM public.integrations WHERE tenant_id = $1 AND status = 'active') as active_integrations
            FROM public.messages m
            WHERE tenant_id = $1 
            AND created_at >= NOW() - INTERVAL '${days} days'
            ${siteFilter}
        `, [tenantId, ...siteParams]);

        // Previous period stats for growth calculation
        const previousStatsQuery = await query<{
            prev_messages: number;
            prev_conversations: number;
            prev_confidence: number;
            prev_escalation_rate: number;
        }>(`
            SELECT 
                COUNT(CASE WHEN role = 'user' THEN 1 END)::int as prev_messages,
                COUNT(DISTINCT conversation_id)::int as prev_conversations,
                AVG(CASE WHEN confidence IS NOT NULL THEN confidence ELSE 0 END) as prev_confidence,
                (COUNT(CASE WHEN confidence < 0.55 THEN 1 END)::float / NULLIF(COUNT(CASE WHEN role = 'assistant' THEN 1 END), 0)) * 100 as prev_escalation_rate
            FROM public.messages m
            WHERE tenant_id = $1 
            AND created_at >= NOW() - INTERVAL '${days * 2} days'
            AND created_at < NOW() - INTERVAL '${days} days'
            ${siteFilter}
        `, [tenantId, ...siteParams]);

        // Conversation trends over time
        const conversationTrendsQuery = await query<{
            date: string;
            conversations: number;
            messages: number;
            escalations: number;
        }>(`
            SELECT 
                date_trunc('day', created_at)::date::text as date,
                COUNT(DISTINCT conversation_id)::int as conversations,
                COUNT(CASE WHEN role = 'user' THEN 1 END)::int as messages,
                COUNT(CASE WHEN confidence < 0.55 THEN 1 END)::int as escalations
            FROM public.messages m
            WHERE tenant_id = $1 
            AND created_at >= NOW() - INTERVAL '${days} days'
            ${siteFilter}
            GROUP BY date_trunc('day', created_at)::date
            ORDER BY date
        `, [tenantId, ...siteParams]);

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
            FROM public.messages m
            WHERE tenant_id = $1 
            AND confidence IS NOT NULL
            AND created_at >= NOW() - INTERVAL '${days} days'
            ${siteFilter}
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
        `, [tenantId, ...siteParams]);

        // Response time by hour
        const responseTimeQuery = await query<{
            hour: number;
            volume: number;
        }>(`
            SELECT 
                EXTRACT(hour FROM created_at)::int as hour,
                COUNT(*)::int as volume
            FROM public.messages m
            WHERE tenant_id = $1 
            AND created_at >= NOW() - INTERVAL '7 days'
            ${siteFilter}
            GROUP BY EXTRACT(hour FROM created_at)
            ORDER BY hour
        `, [tenantId, ...siteParams]);

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
            AND m.created_at >= NOW() - INTERVAL '${days} days'
            ${siteFilter}
            GROUP BY d.id, d.title
            ORDER BY queries DESC
            LIMIT 10
        `, [tenantId, ...siteParams]);

        // Calculate trends (comparing current vs previous period)
        const calculateGrowth = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        const currData = currentStatsQuery.rows[0] || {
            total_messages: 0,
            total_conversations: 0,
            avg_confidence: 0,
            escalation_rate: 0,
            active_integrations: 0
        };

        const prevData = previousStatsQuery.rows[0] || {
            prev_messages: 0,
            prev_conversations: 0,
            prev_confidence: 0,
            prev_escalation_rate: 0
        };

        // Process conversation trends data to fill gaps
        const lastNDays = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            return date.toISOString().split('T')[0];
        });

        const conversationsByDay = lastNDays.map(date => {
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

        // Process response time data with mock response times
        const responseTimeByHour = Array.from({ length: 24 }, (_, hour) => {
            const data = responseTimeQuery.rows.find(row => row.hour === hour);
            const volume = data?.volume || 0;
            // Mock response time based on realistic patterns (higher during business hours)
            const baseResponseTime = hour >= 9 && hour <= 17 ? 2.5 : 1.8;
            const variation = Math.random() * 0.8 - 0.4; // ±0.4s variation
            const avgResponse = volume > 0 ? Math.max(1.0, baseResponseTime + variation) : 0;

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

        const analyticsData = {
            totalMessages: currData.total_messages,
            totalConversations: currData.total_conversations,
            avgConfidence: Math.round((currData.avg_confidence || 0) * 100),
            escalationRate: Math.round(currData.escalation_rate || 0),
            avgResponseTime: 2.3, // Mock average response time
            activeIntegrations: currData.active_integrations,
            messagesGrowth: calculateGrowth(currData.total_messages, prevData.prev_messages),
            conversationsGrowth: calculateGrowth(currData.total_conversations, prevData.prev_conversations),
            confidenceGrowth: calculateGrowth(
                (currData.avg_confidence || 0) * 100,
                (prevData.prev_confidence || 0) * 100
            ),
            escalationGrowth: calculateGrowth(
                currData.escalation_rate || 0,
                prevData.prev_escalation_rate || 0
            ),
            responseTimeGrowth: -5.2, // Mock improvement
            integrationsGrowth: 0, // Assuming stable integration count
            conversationsByDay,
            confidenceDistribution,
            responseTimeByHour,
            topSources
        };

        return NextResponse.json(analyticsData);

    } catch (error) {
        console.error('Analytics API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics data' },
            { status: 500 }
        );
    }
}

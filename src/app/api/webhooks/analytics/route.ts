import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Get comprehensive webhook analytics for a tenant
 */
async function handleWebhookAnalytics(req: AuthenticatedRequest) {
    try {
        const { tenantId } = req;
        const url = new URL(req.url);
        const timeframe = url.searchParams.get('timeframe') || '30d';

        // Calculate days for interval
        let days = 30;
        switch (timeframe) {
            case '1d': days = 1; break;
            case '7d': days = 7; break;
            case '30d': days = 30; break;
            case '90d': days = 90; break;
        }

        // Overall webhook statistics
        const { rows: overallStats } = await query(`
      SELECT 
        COUNT(DISTINCT we.id) as total_webhooks,
        COUNT(DISTINCT CASE WHEN we.is_active THEN we.id END) as active_webhooks,
        COUNT(wd.id) as total_deliveries,
        COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN wd.failed_at IS NOT NULL THEN 1 END) as failed_deliveries,
        ROUND(
          CASE 
            WHEN COUNT(wd.id) > 0 
            THEN (COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END)::numeric / COUNT(wd.id)::numeric) * 100 
            ELSE 100 
          END, 2
        ) as success_rate
      FROM public.webhook_endpoints we
      LEFT JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id 
        AND wd.created_at >= NOW() - INTERVAL '1 day' * $2
      WHERE we.tenant_id = $1
    `, [tenantId, days]);

        // Daily delivery trends
        const { rows: dailyTrends } = await query(`
      SELECT 
        DATE(wd.created_at) as date,
        COUNT(wd.id) as total_deliveries,
        COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN wd.failed_at IS NOT NULL THEN 1 END) as failed_deliveries
      FROM public.webhook_endpoints we
      JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id
      WHERE we.tenant_id = $1 
        AND wd.created_at >= NOW() - INTERVAL '1 day' * $2
      GROUP BY DATE(wd.created_at)
      ORDER BY DATE(wd.created_at) DESC
      LIMIT 30
    `, [tenantId, days]);

        // Event type breakdown
        const { rows: eventStats } = await query(`
      SELECT 
        wd.event_type,
        COUNT(wd.id) as total_deliveries,
        COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN wd.failed_at IS NOT NULL THEN 1 END) as failed_deliveries
      FROM public.webhook_endpoints we
      JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id
      WHERE we.tenant_id = $1 
        AND wd.created_at >= NOW() - INTERVAL '1 day' * $2
      GROUP BY wd.event_type
      ORDER BY total_deliveries DESC
    `, [tenantId, days]);

        // Individual webhook performance
        const { rows: webhookStats } = await query(`
      SELECT 
        we.id,
        we.name,
        we.url,
        we.is_active,
        COUNT(wd.id) as total_deliveries,
        COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
        COUNT(CASE WHEN wd.failed_at IS NOT NULL THEN 1 END) as failed_deliveries
      FROM public.webhook_endpoints we
      LEFT JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id 
        AND wd.created_at >= NOW() - INTERVAL '1 day' * $2
      WHERE we.tenant_id = $1
      GROUP BY we.id, we.name, we.url, we.is_active
      ORDER BY total_deliveries DESC
    `, [tenantId, days]);

        return NextResponse.json({
            timeframe,
            generated_at: new Date().toISOString(),
            overview: overallStats[0] || {
                total_webhooks: 0,
                active_webhooks: 0,
                total_deliveries: 0,
                successful_deliveries: 0,
                failed_deliveries: 0,
                success_rate: 100
            },
            daily_trends: dailyTrends,
            event_breakdown: eventStats,
            webhook_performance: webhookStats
        });

    } catch (error) {
        console.error('Error fetching webhook analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch webhook analytics' },
            { status: 500 }
        );
    }
}

// Apply authentication middleware
export const GET = withAuth(handleWebhookAnalytics);

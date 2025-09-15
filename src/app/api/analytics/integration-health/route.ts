import { NextResponse } from 'next/server';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type IntegrationHealthData = {
    id: string;
    name: string;
    provider: string;
    status: 'active' | 'error' | 'warning' | 'disabled';
    last_delivery: string | null;
    success_rate: number;
    total_deliveries: number;
    failed_deliveries: number;
    avg_response_time: number;
    uptime: number;
    webhook_endpoint_id?: string;
};

type IntegrationHealthResponse = {
    integrations: IntegrationHealthData[];
    overall: {
        totalIntegrations: number;
        activeIntegrations: number;
        averageUptime: number;
        averageSuccessRate: number;
        totalDeliveries: number;
        failedDeliveries: number;
    };
    trends: Array<{
        date: string;
        totalDeliveries: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        averageResponseTime: number;
    }>;
};

export async function GET() {
    try {
        const tenantId = await getTenantIdStrict();
        const days = 1; // Look at just the last day to see recent activity

        // Get integration health data with outbox metrics and escalation counts
        const { rows: integrations } = await query<IntegrationHealthData>(`
            WITH integration_stats AS (
                SELECT 
                    i.id,
                    i.name,
                    i.provider,
                    i.status,
                    COALESCE(COUNT(io.id), 0) as total_deliveries,
                    COALESCE(COUNT(CASE WHEN io.status = 'sent' OR io.sent_at IS NOT NULL THEN 1 END), 0) as successful_deliveries,
                    COALESCE(COUNT(CASE WHEN io.status = 'failed' AND io.sent_at IS NULL THEN 1 END), 0) as failed_deliveries,
                    MAX(COALESCE(io.sent_at, io.created_at)) as last_delivery,
                    -- Count recent escalations for this tenant
                    COALESCE((
                        SELECT COUNT(*)
                        FROM public.escalations e
                        WHERE e.tenant_id = i.tenant_id
                        AND e.created_at >= NOW() - INTERVAL '1 day' * $2
                    ), 0) as escalation_count
                FROM public.integrations i
                LEFT JOIN public.integration_outbox io ON io.integration_id = i.id 
                    AND io.created_at >= NOW() - INTERVAL '1 day' * $2
                WHERE i.tenant_id = $1
                GROUP BY i.id, i.name, i.provider, i.status, i.tenant_id
            )
            SELECT 
                id,
                name,
                provider,
                status,
                null as webhook_endpoint_id,
                last_delivery,
                (total_deliveries + escalation_count)::int as total_deliveries,
                failed_deliveries::int as failed_deliveries,
                -- Success rate: percentage of successful deliveries vs failed
                CASE 
                    WHEN (total_deliveries + escalation_count) > 0 
                    THEN ROUND(((successful_deliveries + escalation_count)::numeric / (total_deliveries + escalation_count)::numeric) * 100, 2)
                    ELSE 100 
                END::numeric as success_rate,
                0::numeric as avg_response_time,
                -- Uptime: service availability based on integration status
                CASE 
                    WHEN status = 'active' THEN 99.9
                    WHEN status = 'disabled' THEN 0
                    WHEN status = 'error' THEN 85.0
                    ELSE 95.0
                END::numeric as uptime
            FROM integration_stats
            ORDER BY name
        `, [tenantId, days]);

        // Get overall statistics
        const totalIntegrations = integrations.length;
        const activeIntegrations = integrations.filter(i => i.status === 'active').length;
        const totalDeliveries = integrations.reduce((sum, i) => sum + (Number(i.total_deliveries) || 0), 0);
        const failedDeliveries = integrations.reduce((sum, i) => sum + (Number(i.failed_deliveries) || 0), 0);
        const averageSuccessRate = totalIntegrations > 0
            ? integrations.reduce((sum, i) => sum + (Number(i.success_rate) || 100), 0) / totalIntegrations
            : 100;
        const averageUptime = totalIntegrations > 0
            ? integrations.reduce((sum, i) => sum + (Number(i.uptime) || 100), 0) / totalIntegrations
            : 100;

        // Get daily trends for integration deliveries (including direct escalations)
        const { rows: trends } = await query(`
            WITH daily_deliveries AS (
                SELECT 
                    DATE(io.created_at) as date,
                    COUNT(io.id) as outbox_deliveries,
                    COUNT(CASE WHEN io.status = 'sent' OR io.sent_at IS NOT NULL THEN 1 END) as outbox_successful,
                    COUNT(CASE WHEN io.status = 'failed' AND io.sent_at IS NULL THEN 1 END) as outbox_failed
                FROM public.integration_outbox io
                JOIN public.integrations i ON i.id = io.integration_id
                WHERE i.tenant_id = $1 
                    AND io.created_at >= NOW() - INTERVAL '1 day' * $2
                GROUP BY DATE(io.created_at)
            ),
            daily_escalations AS (
                SELECT 
                    DATE(e.created_at) as date,
                    COUNT(e.id) as escalation_count
                FROM public.escalations e
                WHERE e.tenant_id = $1 
                    AND e.created_at >= NOW() - INTERVAL '1 day' * $2
                GROUP BY DATE(e.created_at)
            )
            SELECT 
                COALESCE(d.date, e.date) as date,
                COALESCE(d.outbox_deliveries, 0) + COALESCE(e.escalation_count, 0) as total_deliveries,
                COALESCE(d.outbox_successful, 0) + COALESCE(e.escalation_count, 0) as successful_deliveries,
                COALESCE(d.outbox_failed, 0) as failed_deliveries,
                0 as average_response_time
            FROM daily_deliveries d
            FULL OUTER JOIN daily_escalations e ON d.date = e.date
            WHERE COALESCE(d.date, e.date) IS NOT NULL
            ORDER BY date DESC
            LIMIT 30
        `, [tenantId, days]);

        const response: IntegrationHealthResponse = {
            integrations: integrations.map(integration => ({
                ...integration,
                successRate: Number(integration.success_rate) || 0,
                uptime: Number(integration.uptime) || 0,
                avgResponseTime: Number(integration.avg_response_time) || 0,
                totalDeliveries: Number(integration.total_deliveries) || 0,
                failedDeliveries: Number(integration.failed_deliveries) || 0,
                lastDelivery: integration.last_delivery
            })),
            overall: {
                totalIntegrations,
                activeIntegrations,
                averageUptime: Math.round(averageUptime * 100) / 100,
                averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
                totalDeliveries,
                failedDeliveries
            },
            trends: trends.map(row => ({
                date: row.date,
                totalDeliveries: row.total_deliveries || 0,
                successfulDeliveries: row.successful_deliveries || 0,
                failedDeliveries: row.failed_deliveries || 0,
                averageResponseTime: Math.round((row.average_response_time || 0) * 100) / 100,
                last_delivery: row.last_delivery
            }))
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Integration health analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch integration health analytics' },
            { status: 500 }
        );
    }
}

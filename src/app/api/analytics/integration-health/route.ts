import { NextResponse } from 'next/server';
import { getTenantIdServer } from '@/lib/auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type IntegrationHealthData = {
    id: string;
    name: string;
    provider: string;
    status: 'active' | 'error' | 'warning' | 'disabled';
    lastDelivery: string | null;
    successRate: number;
    totalDeliveries: number;
    failedDeliveries: number;
    avgResponseTime: number;
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
        const tenantId = await getTenantIdServer({ allowEnvFallback: true });
        const days = 30; // Could be made configurable later

        // Get integration health data with outbox metrics
        const { rows: integrations } = await query<IntegrationHealthData>(`
            WITH integration_stats AS (
                SELECT 
                    i.id,
                    i.name,
                    i.provider,
                    i.status,
                    COUNT(io.id) as total_deliveries,
                    COUNT(CASE WHEN io.status = 'sent' THEN 1 END) as successful_deliveries,
                    COUNT(CASE WHEN io.status = 'failed' THEN 1 END) as failed_deliveries,
                    MAX(io.sent_at) as last_delivery
                FROM public.integrations i
                LEFT JOIN public.integration_outbox io ON io.integration_id = i.id 
                    AND io.created_at >= NOW() - INTERVAL '1 day' * $2
                WHERE i.tenant_id = $1
                GROUP BY i.id, i.name, i.provider, i.status
            )
            SELECT 
                id,
                name,
                provider,
                status,
                null as webhook_endpoint_id,
                last_delivery,
                total_deliveries,
                failed_deliveries,
                CASE 
                    WHEN total_deliveries > 0 
                    THEN ROUND((successful_deliveries::numeric / total_deliveries::numeric) * 100, 2)
                    ELSE 100 
                END as success_rate,
                0 as avg_response_time,
                CASE 
                    WHEN total_deliveries > 0 
                    THEN ROUND((successful_deliveries::numeric / total_deliveries::numeric) * 100, 2)
                    ELSE 100 
                END as uptime
            FROM integration_stats
            ORDER BY name
        `, [tenantId, days]);

        // Get overall statistics
        const totalIntegrations = integrations.length;
        const activeIntegrations = integrations.filter(i => i.status === 'active').length;
        const totalDeliveries = integrations.reduce((sum, i) => sum + (i.totalDeliveries || 0), 0);
        const failedDeliveries = integrations.reduce((sum, i) => sum + (i.failedDeliveries || 0), 0);
        const averageSuccessRate = totalIntegrations > 0
            ? integrations.reduce((sum, i) => sum + (i.successRate || 100), 0) / totalIntegrations
            : 100;
        const averageUptime = totalIntegrations > 0
            ? integrations.reduce((sum, i) => sum + (i.uptime || 100), 0) / totalIntegrations
            : 100;

        // Get daily trends for integration deliveries
        const { rows: trends } = await query(`
            SELECT 
                DATE(io.created_at) as date,
                COUNT(io.id) as total_deliveries,
                COUNT(CASE WHEN io.status = 'sent' THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN io.status = 'failed' THEN 1 END) as failed_deliveries,
                0 as average_response_time
            FROM public.integration_outbox io
            JOIN public.integrations i ON i.id = io.integration_id
            WHERE i.tenant_id = $1 
                AND io.created_at >= NOW() - INTERVAL '1 day' * $2
            GROUP BY DATE(io.created_at)
            ORDER BY date DESC
            LIMIT 30
        `, [tenantId, days]);

        const response: IntegrationHealthResponse = {
            integrations,
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
                averageResponseTime: Math.round((row.average_response_time || 0) * 100) / 100
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

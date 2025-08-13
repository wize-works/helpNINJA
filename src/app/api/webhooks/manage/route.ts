import { NextResponse } from 'next/server';
import { requireApiKey, AuthenticatedRequest } from '@/lib/auth-middleware';
import { retryFailedWebhooks, cleanupOldWebhookDeliveries } from '@/lib/webhook-retry';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Manual webhook retry endpoint - requires API key with 'admin' permission
 */
async function handleWebhookRetry(req: AuthenticatedRequest) {
    try {
        const { tenantId } = req;
        const url = new URL(req.url);
        const action = url.searchParams.get('action');

        switch (action) {
            case 'retry':
                await retryFailedWebhooks();
                return NextResponse.json({
                    message: 'Webhook retry process completed',
                    timestamp: new Date().toISOString()
                });

            case 'cleanup':
                await cleanupOldWebhookDeliveries();
                return NextResponse.json({
                    message: 'Webhook cleanup completed',
                    timestamp: new Date().toISOString()
                });

            case 'status':
                // Get webhook delivery statistics for the tenant
                const { rows } = await query(`
          SELECT 
            we.id,
            we.name,
            we.url,
            we.is_active,
            we.last_success_at,
            we.last_failure_at,
            we.failure_count,
            COUNT(wd.id)::int as total_deliveries,
            COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END)::int as successful_deliveries,
            COUNT(CASE WHEN wd.failed_at IS NOT NULL THEN 1 END)::int as failed_deliveries,
            COUNT(CASE WHEN wd.delivered_at IS NULL AND wd.failed_at IS NULL THEN 1 END)::int as pending_deliveries
          FROM public.webhook_endpoints we
          LEFT JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id 
            AND wd.created_at > NOW() - INTERVAL '24 hours'
          WHERE we.tenant_id = $1
          GROUP BY we.id
          ORDER BY we.created_at DESC
        `, [tenantId]);

                return NextResponse.json({
                    webhooks: rows.map(row => ({
                        id: row.id,
                        name: row.name,
                        url: row.url,
                        is_active: row.is_active,
                        last_success_at: row.last_success_at,
                        last_failure_at: row.last_failure_at,
                        failure_count: row.failure_count,
                        stats_24h: {
                            total_deliveries: row.total_deliveries,
                            successful_deliveries: row.successful_deliveries,
                            failed_deliveries: row.failed_deliveries,
                            pending_deliveries: row.pending_deliveries,
                            success_rate: row.total_deliveries > 0
                                ? Math.round((row.successful_deliveries / row.total_deliveries) * 100)
                                : 100
                        }
                    }))
                });

            default:
                return NextResponse.json(
                    { error: 'Invalid action. Use: retry, cleanup, or status' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error in webhook management:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook request' },
            { status: 500 }
        );
    }
}

// Apply API-key-only authentication with 'admin' permission
export const GET = requireApiKey(['admin'])(handleWebhookRetry);
export const POST = requireApiKey(['admin'])(handleWebhookRetry);

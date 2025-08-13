import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Debug webhook deliveries - see what's actually in the database
 */
async function handleWebhookDebug(req: AuthenticatedRequest) {
    try {
        const { tenantId } = req;
        const url = new URL(req.url);
        const action = url.searchParams.get('action') || 'deliveries';

        switch (action) {
            case 'deliveries':
                // Get all webhook deliveries for the tenant
                const { rows: deliveries } = await query(`
          SELECT 
            wd.id,
            wd.event_type,
            wd.created_at,
            wd.delivered_at,
            wd.failed_at,
            wd.delivery_attempts,
            wd.response_status,
            wd.response_body,
            wd.next_retry_at,
            we.name as webhook_name,
            we.url as webhook_url,
            we.is_active,
            CASE 
              WHEN wd.delivered_at IS NOT NULL THEN 'delivered'
              WHEN wd.failed_at IS NOT NULL THEN 'failed'
              ELSE 'pending'
            END as status
          FROM public.webhook_deliveries wd
          JOIN public.webhook_endpoints we ON we.id = wd.webhook_endpoint_id
          WHERE we.tenant_id = $1
          ORDER BY wd.created_at DESC
          LIMIT 20
        `, [tenantId]);

                return NextResponse.json({
                    deliveries: deliveries.map(d => ({
                        id: d.id,
                        event_type: d.event_type,
                        webhook_name: d.webhook_name,
                        webhook_url: d.webhook_url,
                        webhook_active: d.is_active,
                        status: d.status,
                        delivery_attempts: d.delivery_attempts,
                        created_at: d.created_at,
                        delivered_at: d.delivered_at,
                        failed_at: d.failed_at,
                        next_retry_at: d.next_retry_at,
                        response_status: d.response_status,
                        response_body: d.response_body
                    }))
                });

            case 'pending':
                // Get only pending deliveries
                const { rows: pending } = await query(`
          SELECT 
            wd.id,
            wd.event_type,
            wd.payload,
            wd.created_at,
            wd.delivery_attempts,
            we.name as webhook_name,
            we.url as webhook_url,
            we.is_active
          FROM public.webhook_deliveries wd
          JOIN public.webhook_endpoints we ON we.id = wd.webhook_endpoint_id
          WHERE we.tenant_id = $1
            AND wd.delivered_at IS NULL 
            AND wd.failed_at IS NULL
          ORDER BY wd.created_at DESC
        `, [tenantId]);

                return NextResponse.json({
                    pending_deliveries: pending.map(p => ({
                        id: p.id,
                        event_type: p.event_type,
                        webhook_name: p.webhook_name,
                        webhook_url: p.webhook_url,
                        webhook_active: p.is_active,
                        created_at: p.created_at,
                        delivery_attempts: p.delivery_attempts,
                        payload: JSON.parse(p.payload)
                    }))
                });

            case 'failed':
                // Get failed deliveries
                const { rows: failed } = await query(`
          SELECT 
            wd.id,
            wd.event_type,
            wd.created_at,
            wd.failed_at,
            wd.delivery_attempts,
            wd.response_status,
            wd.response_body,
            we.name as webhook_name,
            we.url as webhook_url
          FROM public.webhook_deliveries wd
          JOIN public.webhook_endpoints we ON we.id = wd.webhook_endpoint_id
          WHERE we.tenant_id = $1
            AND wd.failed_at IS NOT NULL
          ORDER BY wd.failed_at DESC
          LIMIT 10
        `, [tenantId]);

                return NextResponse.json({
                    failed_deliveries: failed
                });

            case 'endpoints':
                // Get webhook endpoints
                const { rows: endpoints } = await query(`
          SELECT 
            we.id,
            we.name,
            we.url,
            we.events,
            we.is_active,
            we.created_at,
            we.last_success_at,
            we.last_failure_at,
            we.failure_count,
            COUNT(wd.id)::int as total_deliveries
          FROM public.webhook_endpoints we
          LEFT JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id
          WHERE we.tenant_id = $1
          GROUP BY we.id
          ORDER BY we.created_at DESC
        `, [tenantId]);

                return NextResponse.json({
                    endpoints: endpoints
                });

            default:
                return NextResponse.json({
                    available_actions: ['deliveries', 'pending', 'failed', 'endpoints'],
                    usage: 'Add ?action=<action> to the URL'
                });
        }
    } catch (error) {
        console.error('Error in webhook debug:', error);
        return NextResponse.json(
            { error: 'Failed to fetch webhook debug info' },
            { status: 500 }
        );
    }
}

// Apply authentication middleware
export const GET = withAuth(handleWebhookDebug);

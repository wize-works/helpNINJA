import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import crypto from 'crypto';
import { trackActivity } from '@/lib/activity-tracker';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // Track user activity for webhooks viewing
        await trackActivity();

        const tenantId = await getTenantIdStrict();

        const { rows } = await query(`
            SELECT 
                we.id,
                we.name,
                we.url,
                we.events,
                we.is_active,
                we.last_success_at,
                we.last_failure_at,
                we.failure_count,
                we.created_at,
                we.updated_at,
                COUNT(wd.id)::int as total_deliveries,
                COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END)::int as successful_deliveries,
                COUNT(CASE WHEN wd.failed_at IS NOT NULL THEN 1 END)::int as failed_deliveries
            FROM public.webhook_endpoints we
            LEFT JOIN public.webhook_deliveries wd ON wd.webhook_endpoint_id = we.id 
                AND wd.created_at > NOW() - INTERVAL '30 days'
            WHERE we.tenant_id = $1
            GROUP BY we.id
            ORDER BY we.created_at DESC
        `, [tenantId]);

        const webhooks = rows.map(row => ({
            id: row.id,
            name: row.name,
            url: row.url,
            events: row.events,
            is_active: row.is_active,
            last_success_at: row.last_success_at,
            last_failure_at: row.last_failure_at,
            failure_count: row.failure_count,
            created_at: row.created_at,
            updated_at: row.updated_at,
            stats: {
                total_deliveries: row.total_deliveries,
                successful_deliveries: row.successful_deliveries,
                failed_deliveries: row.failed_deliveries,
                success_rate: row.total_deliveries > 0
                    ? Math.round((row.successful_deliveries / row.total_deliveries) * 100)
                    : 100
            }
        }));

        return NextResponse.json(webhooks);
    } catch (error) {
        console.error('Error fetching webhooks:', error);
        return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Track user activity for webhook creation
        await trackActivity();

        const tenantId = await getTenantIdStrict();
        const body = await req.json();
        const { name, url, events = [], generateSecret = true } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Webhook name is required' }, { status: 400 });
        }

        if (!url?.trim()) {
            return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
        }

        // Validate URL format
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }

        // Validate events
        const validEvents = [
            'conversation.started',
            'conversation.ended',
            'message.sent',
            'escalation.triggered',
            'rule.matched',
            'document.ingested',
            'site.verified'
        ];

        if (events.some((e: string) => !validEvents.includes(e))) {
            return NextResponse.json({ error: 'Invalid event types specified' }, { status: 400 });
        }

        // Generate webhook secret if requested
        let secret = null;
        if (generateSecret) {
            secret = crypto.randomBytes(32).toString('hex');
        }

        // Insert webhook
        const { rows } = await query(
            `INSERT INTO public.webhook_endpoints (tenant_id, name, url, secret, events)
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [tenantId, name.trim(), url.trim(), secret, events]
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'webhook_created', 'webhook', $3, $4)`,
            [tenantId, null, rows[0].id, JSON.stringify({ name, url, events })]
        );

        return NextResponse.json({
            id: rows[0].id,
            message: 'Webhook created successfully',
            secret: secret // Only return secret on creation
        });
    } catch (error) {
        console.error('Error creating webhook:', error);
        return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }
}

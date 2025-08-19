import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
        }

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
            WHERE we.id = $1 AND we.tenant_id = $2
            GROUP BY we.id
        `, [id, tenantId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
        }

        const webhook = rows[0];
        return NextResponse.json({
            id: webhook.id,
            name: webhook.name,
            url: webhook.url,
            events: webhook.events,
            is_active: webhook.is_active,
            last_success_at: webhook.last_success_at,
            last_failure_at: webhook.last_failure_at,
            failure_count: webhook.failure_count,
            created_at: webhook.created_at,
            updated_at: webhook.updated_at,
            stats: {
                total_deliveries: webhook.total_deliveries,
                successful_deliveries: webhook.successful_deliveries,
                failed_deliveries: webhook.failed_deliveries,
                success_rate: webhook.total_deliveries > 0
                    ? Math.round((webhook.successful_deliveries / webhook.total_deliveries) * 100)
                    : 100
            }
        });
    } catch (error) {
        console.error('Error fetching webhook:', error);
        return NextResponse.json({ error: 'Failed to fetch webhook' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
        }

        const { name, url, events, isActive } = body;

        // Check if webhook exists
        const existing = await query(
            'SELECT id, name FROM public.webhook_endpoints WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
        }

        // Build update query
        const updates: string[] = [];
        const params: unknown[] = [id, tenantId];
        let paramIndex = 3;

        if (name !== undefined) {
            if (!name?.trim()) {
                return NextResponse.json({ error: 'Webhook name cannot be empty' }, { status: 400 });
            }
            updates.push(`name = $${paramIndex++}`);
            params.push(name.trim());
        }

        if (url !== undefined) {
            if (!url?.trim()) {
                return NextResponse.json({ error: 'Webhook URL cannot be empty' }, { status: 400 });
            }

            // Validate URL format
            try {
                new URL(url.trim());
            } catch {
                return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
            }

            updates.push(`url = $${paramIndex++}`);
            params.push(url.trim());
        }

        if (events !== undefined) {
            const validEvents = [
                'conversation.started',
                'conversation.ended',
                'message.sent',
                'escalation.triggered',
                'rule.matched',
                'document.ingested',
                'site.verified'
            ];

            if (!Array.isArray(events) || events.length === 0) {
                return NextResponse.json({ error: 'At least one event must be selected' }, { status: 400 });
            }

            if (events.some((e: string) => !validEvents.includes(e))) {
                return NextResponse.json({ error: 'Invalid event types specified' }, { status: 400 });
            }

            updates.push(`events = $${paramIndex++}`);
            params.push(events);
        }

        if (isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            params.push(isActive);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Add updated_at
        updates.push(`updated_at = NOW()`);

        await query(
            `UPDATE public.webhook_endpoints SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            params
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'webhook_updated', 'webhook', $3, $4)`,
            [tenantId, null, id, JSON.stringify({ name, url, events, isActive })]
        );

        return NextResponse.json({ message: 'Webhook updated successfully' });
    } catch (error) {
        console.error('Error updating webhook:', error);
        return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
        }

        // Check if webhook exists
        const existing = await query(
            'SELECT id, name, url FROM public.webhook_endpoints WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
        }

        const webhook = existing.rows[0];

        // Delete webhook (cascades to deliveries)
        await query('DELETE FROM public.webhook_endpoints WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'webhook_deleted', 'webhook', $3, $4)`,
            [tenantId, null, id, JSON.stringify({ name: webhook.name, url: webhook.url })]
        );

        return NextResponse.json({ message: 'Webhook deleted successfully' });
    } catch (error) {
        console.error('Error deleting webhook:', error);
        return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }
}

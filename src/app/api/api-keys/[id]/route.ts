import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'API key ID required' }, { status: 400 });
        }

        const { rows } = await query(`
            SELECT 
                ak.id,
                ak.name,
                ak.key_type,
                ak.key_prefix,
                ak.permissions,
                ak.last_used_at,
                ak.usage_count,
                ak.rate_limit_per_hour,
                ak.expires_at,
                ak.created_at,
                ak.updated_at,
                u.email as created_by_email
            FROM public.api_keys ak
            LEFT JOIN public.users u ON u.id = ak.created_by
            WHERE ak.id = $1 AND ak.tenant_id = $2
        `, [id, tenantId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        const apiKey = rows[0];
        return NextResponse.json({
            id: apiKey.id,
            name: apiKey.name,
            key_type: apiKey.key_type,
            key_prefix: apiKey.key_prefix,
            permissions: apiKey.permissions,
            last_used_at: apiKey.last_used_at,
            usage_count: parseInt(apiKey.usage_count),
            rate_limit_per_hour: apiKey.rate_limit_per_hour,
            expires_at: apiKey.expires_at,
            created_at: apiKey.created_at,
            updated_at: apiKey.updated_at,
            created_by_email: apiKey.created_by_email,
            is_expired: apiKey.expires_at ? new Date(apiKey.expires_at) < new Date() : false
        });
    } catch (error) {
        console.error('Error fetching API key:', error);
        return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = await ctx.params;
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'API key ID required' }, { status: 400 });
        }

        const { name, permissions, rateLimitPerHour, expiresInDays } = body;

        // Check if API key exists
        const existing = await query(
            'SELECT id, name FROM public.api_keys WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        // Build update query
        const updates: string[] = [];
        const params: unknown[] = [id, tenantId];
        let paramIndex = 3;

        if (name !== undefined) {
            if (!name?.trim()) {
                return NextResponse.json({ error: 'API key name cannot be empty' }, { status: 400 });
            }
            updates.push(`name = $${paramIndex++}`);
            params.push(name.trim());
        }

        if (permissions !== undefined) {
            const validPermissions = [
                'chat.send', 'documents.read', 'documents.write',
                'analytics.read', 'webhooks.send'
            ];
            if (permissions.some((p: string) => !validPermissions.includes(p))) {
                return NextResponse.json({ error: 'Invalid permissions specified' }, { status: 400 });
            }
            updates.push(`permissions = $${paramIndex++}`);
            params.push(permissions);
        }

        if (rateLimitPerHour !== undefined) {
            if (rateLimitPerHour < 1 || rateLimitPerHour > 10000) {
                return NextResponse.json({ error: 'Rate limit must be between 1 and 10000' }, { status: 400 });
            }
            updates.push(`rate_limit_per_hour = $${paramIndex++}`);
            params.push(rateLimitPerHour);
        }

        if (expiresInDays !== undefined) {
            let expiresAt = null;
            if (expiresInDays && expiresInDays > 0) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + expiresInDays);
            }
            updates.push(`expires_at = $${paramIndex++}`);
            params.push(expiresAt);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        // Add updated_at
        updates.push(`updated_at = NOW()`);

        await query(
            `UPDATE public.api_keys SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            params
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'api_key_updated', 'api_key', $3, $4)`,
            [tenantId, null, id, JSON.stringify({ name, permissions, rateLimitPerHour })]
        );

        return NextResponse.json({ message: 'API key updated successfully' });
    } catch (error) {
        console.error('Error updating API key:', error);
        return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'API key ID required' }, { status: 400 });
        }

        // Check if API key exists
        const existing = await query(
            'SELECT id, name, key_type FROM public.api_keys WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        const apiKey = existing.rows[0];

        // Prevent deleting the last secret key (if it's the tenant's main key)
        if (apiKey.key_type === 'secret') {
            const secretKeyCount = await query(
                'SELECT COUNT(*) as count FROM public.api_keys WHERE tenant_id = $1 AND key_type = $2',
                [tenantId, 'secret']
            );

            if (parseInt(secretKeyCount.rows[0].count) <= 1) {
                return NextResponse.json({
                    error: 'Cannot delete the last secret API key'
                }, { status: 403 });
            }
        }

        // Delete API key
        await query('DELETE FROM public.api_keys WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'api_key_deleted', 'api_key', $3, $4)`,
            [tenantId, null, id, JSON.stringify({ name: apiKey.name, key_type: apiKey.key_type })]
        );

        return NextResponse.json({ message: 'API key deleted successfully' });
    } catch (error) {
        console.error('Error deleting API key:', error);
        return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }
}

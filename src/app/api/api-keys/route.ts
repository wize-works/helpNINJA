import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { trackActivity } from '@/lib/activity-tracker';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // Track user activity for API keys viewing
        await trackActivity();

        const tenantId = await getTenantIdStrict();

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
                u.email as created_by_email,
                u.first_name as created_by_first_name,
                u.last_name as created_by_last_name
            FROM public.api_keys ak
            LEFT JOIN public.users u ON u.id = ak.created_by
            WHERE ak.tenant_id = $1
            ORDER BY ak.created_at DESC
        `, [tenantId]);

        const apiKeys = rows.map(row => ({
            id: row.id,
            name: row.name,
            key_type: row.key_type,
            key_prefix: row.key_prefix,
            permissions: row.permissions,
            last_used_at: row.last_used_at,
            usage_count: parseInt(row.usage_count),
            rate_limit_per_hour: row.rate_limit_per_hour,
            expires_at: row.expires_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            created_by_name: row.created_by_first_name && row.created_by_last_name
                ? `${row.created_by_first_name} ${row.created_by_last_name}`
                : row.created_by_email,
            is_expired: row.expires_at ? new Date(row.expires_at) < new Date() : false
        }));

        return NextResponse.json(apiKeys);
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Track user activity for API key creation
        await trackActivity();

        const tenantId = await getTenantIdStrict();
        const body = await req.json();
        const {
            name,
            keyType = 'secret',
            permissions = [],
            rateLimitPerHour = 1000,
            expiresInDays
        } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
        }

        // Validate key type
        const validKeyTypes = ['public', 'secret', 'webhook'];
        if (!validKeyTypes.includes(keyType)) {
            return NextResponse.json({ error: 'Invalid key type' }, { status: 400 });
        }

        // Validate permissions
        const validPermissions = [
            'chat.send', 'documents.read', 'documents.write',
            'analytics.read', 'webhooks.send'
        ];
        if (permissions.some((p: string) => !validPermissions.includes(p))) {
            return NextResponse.json({ error: 'Invalid permissions specified' }, { status: 400 });
        }

        // Generate API key
        const { rows: keyResult } = await query(
            'SELECT generate_api_key($1) as key_value',
            [keyType]
        );
        const keyValue = keyResult[0].key_value;
        const keyPrefix = keyValue.substring(0, 12) + '...'; // Show first 12 chars

        // Calculate expiry date
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        }

        // For demo purposes, we'll use a placeholder created_by user
        const createdBy = await query('SELECT id FROM public.users LIMIT 1');
        const createdByUserId = createdBy.rows[0]?.id;

        // Insert API key
        const { rows } = await query(
            `INSERT INTO public.api_keys (
                tenant_id, name, key_type, key_value, key_prefix, 
                permissions, rate_limit_per_hour, expires_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id`,
            [
                tenantId,
                name.trim(),
                keyType,
                keyValue,
                keyPrefix,
                permissions,
                rateLimitPerHour,
                expiresAt,
                createdByUserId
            ]
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'api_key_created', 'api_key', $3, $4)`,
            [
                tenantId,
                createdByUserId,
                rows[0].id,
                JSON.stringify({ name, keyType, permissions })
            ]
        );

        return NextResponse.json({
            id: rows[0].id,
            message: 'API key created successfully',
            key: keyValue, // Only return full key on creation
            prefix: keyPrefix
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }
}

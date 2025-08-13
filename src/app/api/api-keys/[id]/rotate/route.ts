import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'API key ID required' }, { status: 400 });
        }

        // Get current API key
        const existing = await query(
            'SELECT id, name, key_type FROM public.api_keys WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: 'API key not found' }, { status: 404 });
        }

        const apiKey = existing.rows[0];

        // Generate new API key
        const { rows: keyResult } = await query(
            'SELECT generate_api_key($1) as key_value',
            [apiKey.key_type]
        );
        const newKeyValue = keyResult[0].key_value;
        const newKeyPrefix = newKeyValue.substring(0, 12) + '...';

        // Update the API key
        await query(
            `UPDATE public.api_keys 
             SET key_value = $1, key_prefix = $2, updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4`,
            [newKeyValue, newKeyPrefix, id, tenantId]
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'api_key_rotated', 'api_key', $3, $4)`,
            [tenantId, null, id, JSON.stringify({ name: apiKey.name, key_type: apiKey.key_type })]
        );

        return NextResponse.json({
            message: 'API key rotated successfully',
            key: newKeyValue, // Return new key only on rotation
            prefix: newKeyPrefix
        });
    } catch (error) {
        console.error('Error rotating API key:', error);
        return NextResponse.json({ error: 'Failed to rotate API key' }, { status: 500 });
    }
}

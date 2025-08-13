import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // Check tenants
        const tenants = await query('SELECT id, slug, public_key, secret_key FROM public.tenants LIMIT 5');

        // Check API keys
        const apiKeys = await query('SELECT id, name, key_value, key_prefix, tenant_id, permissions FROM public.api_keys LIMIT 5');

        // Check webhook endpoints
        const webhooks = await query('SELECT id, name, url, events, is_active, tenant_id FROM public.webhook_endpoints LIMIT 5');

        return NextResponse.json({
            tenants: tenants.rows,
            apiKeys: apiKeys.rows,
            webhooks: webhooks.rows,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Debug DB error:', error);
        return NextResponse.json({
            error: 'Database error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

export async function POST() {
    const tenantId = await getTenantIdStrict();
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const { rows } = await query<{ stripe_customer_id: string | null }>(
        'select stripe_customer_id from public.tenants where id=$1',
        [tenantId]
    );
    const customer = rows[0]?.stripe_customer_id;
    if (!customer) return NextResponse.json({ error: 'No Stripe customer on file' }, { status: 400 });
    const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${siteUrl}/billing`,
    });
    return NextResponse.json({ url: portal.url });
}

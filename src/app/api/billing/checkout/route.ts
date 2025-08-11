import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_BY_PLAN, Plan } from '@/lib/stripe';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const { plan } = (await req.json()) as { plan: Plan };
    const tenantId = await resolveTenantIdFromRequest(req, true);
    if (!tenantId || !plan || !(plan in PRICE_BY_PLAN)) {
        return NextResponse.json({ error: 'tenantId and valid plan required' }, { status: 400 });
    }

    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

    const { rows } = await query<{ stripe_customer_id: string | null; name: string | null }>(
        'select stripe_customer_id, name from public.tenants where id=$1',
        [tenantId]
    );
    if (!rows.length) return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
    let customerId = rows[0].stripe_customer_id || undefined;
    if (!customerId) {
        const cust = await stripe.customers.create({ metadata: { tenantId } });
        customerId = cust.id;
        await query('update public.tenants set stripe_customer_id=$1 where id=$2', [customerId, tenantId]);
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: PRICE_BY_PLAN[plan], quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${siteUrl}/billing?success=1`,
        cancel_url: `${siteUrl}/billing?canceled=1`,
        subscription_data: {
            metadata: { tenantId, plan },
        },
        metadata: { tenantId, plan },
    });

    return NextResponse.json({ url: session.url });
}

import { NextRequest, NextResponse } from 'next/server';
import { stripe, planFromPriceId } from '@/lib/stripe';
import Stripe from 'stripe';
import { query } from '@/lib/db';
import { logEvent } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const sig = req.headers.get('stripe-signature')!;
    const buf = await req.text();
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
        return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            const tenantId = session.metadata?.tenantId as string | undefined;
            const subId = session.subscription as string | undefined;
            const customerId = session.customer as string | undefined;
            if (tenantId && subId && customerId) {
                const sub = await stripe.subscriptions.retrieve(subId);
                const priceId = sub.items.data[0]?.price?.id;
                const plan = planFromPriceId(priceId) || 'starter';
                const cpe = (sub as unknown as { current_period_end?: number }).current_period_end ?? 0;
                const periodEnd = new Date(cpe * 1000).toISOString();
                await query(
                    `update public.tenants set stripe_customer_id=$1, stripe_subscription_id=$2, plan=$3, plan_status='active', current_period_end=$4 where id=$5`,
                    [customerId, subId, plan, periodEnd, tenantId]
                );
                await query(
                    `insert into public.usage_counters (tenant_id, period_start, messages_count)
           values ($1, date_trunc('month', now())::date, 0)
           on conflict (tenant_id) do nothing`,
                    [tenantId]
                );
                // Log checkout completion event
                logEvent({ tenantId, name: 'checkout_completed', data: { plan, status: 'active', subscriptionId: subId }, soft: true });
            }
            break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
            const sub = event.data.object as Stripe.Subscription;
            const tenantId = sub.metadata?.tenantId as string | undefined;
            if (tenantId) {
                const priceId = sub.items.data[0]?.price?.id;
                // Prefer explicit plan metadata sent from our app; fallback to price mapping
                const planMeta = (sub.metadata?.plan as string | undefined)?.toLowerCase();
                const plan = (planMeta === 'starter' || planMeta === 'pro' || planMeta === 'agency')
                    ? planMeta
                    : (planFromPriceId(priceId) || 'starter');
                const status = sub.status;
                const cpe = (sub as unknown as { current_period_end?: number }).current_period_end ?? 0;
                const periodEnd = new Date(cpe * 1000).toISOString();
                await query(
                    `update public.tenants set plan=$1, plan_status=$2, stripe_subscription_id=$3, current_period_end=$4 where id=$5`,
                    [plan, status, sub.id, periodEnd, tenantId]
                );
                logEvent({ tenantId, name: 'plan_updated', data: { plan, status, subscriptionId: sub.id }, soft: true });
            }
            break;
        }
        case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            const tenantId = sub.metadata?.tenantId as string | undefined;
            if (tenantId) {
                await query(
                    `update public.tenants set plan_status='canceled' where id=$1`,
                    [tenantId]
                );
                logEvent({ tenantId, name: 'plan_updated', data: { status: 'canceled', subscriptionId: sub.id }, soft: true });
            }
            break;
        }
    }

    return NextResponse.json({ received: true });
}

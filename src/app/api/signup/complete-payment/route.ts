import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query, transaction } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { Plan } from '@/lib/limits';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { setupIntentId } = (await req.json()) as { setupIntentId: string };

        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Not authenticated or no organization found' }, { status: 401 });
        }
        if (!setupIntentId) {
            return NextResponse.json({ error: 'Setup Intent ID required' }, { status: 400 });
        }

        // 1) Retrieve & validate the completed SetupIntent
        const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
        if (setupIntent.status !== 'succeeded') {
            return NextResponse.json({ error: 'Setup not completed' }, { status: 400 });
        }

        const md = setupIntent.metadata ?? {};
        const paymentMethodId =
            typeof setupIntent.payment_method === 'string'
                ? setupIntent.payment_method
                : setupIntent.payment_method?.id || null;

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'No payment method found' }, { status: 400 });
        }

        const { tenantId, plan, billingPeriod, priceId, promotionCode } = md as Record<string, string>;
        if (!tenantId || !plan || !billingPeriod || !priceId) {
            return NextResponse.json({ error: 'Invalid payment metadata' }, { status: 400 });
        }

        // 2) Lock tenant row and ensure customer consistency
        const lockRes = await transaction(async (txQuery) => {
            const tRes = await txQuery(
                'SELECT id, stripe_customer_id FROM public.tenants WHERE id = $1 FOR UPDATE',
                [tenantId]
            ) as import('pg').QueryResult<{ id: string; stripe_customer_id: string | null }>;

            if (tRes.rows.length === 0) {
                return { error: 'Organization not found' as const, status: 404 as const };
            }

            let customerIdDb = tRes.rows[0].stripe_customer_id;
            const siCustomerId = typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id;
            if (!siCustomerId) {
                return { error: 'SetupIntent missing customer' as const, status: 400 as const };
            }

            if (!customerIdDb) {
                // Adopt SI.customer if not set yet
                const upd = await txQuery(
                    'UPDATE public.tenants SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL RETURNING stripe_customer_id',
                    [siCustomerId, tenantId]
                ) as import('pg').QueryResult<{ stripe_customer_id: string }>;
                customerIdDb = upd.rows[0]?.stripe_customer_id ?? siCustomerId;
            }

            if (customerIdDb !== siCustomerId) {
                return { error: 'Payment was confirmed for a different customer. Please retry.' as const, status: 400 as const };
            }

            return { customerId: customerIdDb } as const;
        });

        if ('error' in lockRes) {
            return NextResponse.json({ error: lockRes.error }, { status: lockRes.status });
        }
        const customerId = lockRes.customerId;

        // 4) Inspect/attach PaymentMethod only if needed (SI usually auto-attaches)
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

        if (pm.customer && pm.customer !== customerId) {
            // This PM is already attached to some other customer; cannot "move" it
            return NextResponse.json(
                { error: 'Payment method is attached to another customer. Please re-enter card details.' },
                { status: 400 }
            );
        }

        if (!pm.customer) {
            await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        }

        // 5) Set as default for future invoices
        await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        // 6) Create the subscription (trial + optional promo) with idempotency
        // Optional: block repeat free trials (e.g., const alreadyTrialed = !!tenant.stripe_subscription_id; const trialDays = alreadyTrialed ? 0 : 14;)
        const trialDays = 14;

        const subscription = await stripe.subscriptions.create(
            {
                customer: customerId,
                items: [{ price: priceId, quantity: 1 }],
                trial_period_days: trialDays,
                default_payment_method: paymentMethodId,
                ...(promotionCode ? { discounts: [{ promotion_code: promotionCode }] } : {}),
                metadata: {
                    tenantId,
                    orgId,
                    plan,
                    billingPeriod,
                    context: 'signup',
                    paymentMethodId,
                    ...(promotionCode ? { appliedPromotionCode: promotionCode } : {}),
                },
            },
            { idempotencyKey: `tenant:${tenantId}:subscription:${priceId}:v1` }
        );

        // 7) Persist subscription details
        await query(
            `UPDATE public.tenants
                SET plan = $1,
                    plan_status = $2,
                    stripe_subscription_id = $3,
                    updated_at = now()
                WHERE id = $4`,
            [plan as Plan, subscription.status, subscription.id, tenantId]
        );

        return NextResponse.json({
            success: true,
            subscriptionId: subscription.id,
            status: subscription.status,
        });
    } catch (error) {
        console.error('Payment completion error:', error);
        return NextResponse.json({ error: 'Failed to complete payment setup' }, { status: 500 });
    }
}

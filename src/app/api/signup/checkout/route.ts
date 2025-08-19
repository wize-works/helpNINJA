import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { transaction } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Plan } from '@/lib/limits';
import { QueryResult } from 'pg';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { plan, billingPeriod, priceId } = (await req.json()) as {
            plan: Plan;
            billingPeriod: 'monthly' | 'yearly';
            priceId: string;
        };

        // Get the authenticated user and organization
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Not authenticated or no organization found' }, { status: 401 });
        }

        if (!plan || !['starter', 'pro', 'agency'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
            return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
        }

        if (!priceId) {
            return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
        }

        let customerId: string;
        let tenantId: string;

        try {
            // Get the tenant from the Clerk organization ID and ensure Stripe customer (with transaction)
            const result = await transaction(async (txQuery) => {
                const tenantResult = await txQuery(
                    'SELECT id, stripe_customer_id, name FROM public.tenants WHERE clerk_org_id = $1 FOR UPDATE',
                    [orgId]
                ) as QueryResult<{ id: string; stripe_customer_id: string | null; name: string | null }>;

                if (tenantResult.rows.length === 0) {
                    throw new Error('Organization not found');
                }

                const tenant = tenantResult.rows[0];

                let customerId = tenant.stripe_customer_id;
                if (!customerId) {
                    const customer = await stripe.customers.create(
                        { metadata: { tenantId: tenant.id, orgId } },
                        { idempotencyKey: `tenant:${tenant.id}:customer:v1` }
                    );
                    customerId = customer.id;
                    await txQuery(
                        'UPDATE public.tenants SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL',
                        [customerId, tenant.id]
                    );
                }

                return { customerId, tenantId: tenant.id };
            });

            customerId = result.customerId;
            tenantId = result.tenantId;
        } catch (transactionError) {
            if (transactionError instanceof Error && transactionError.message === 'Organization not found') {
                return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
            }
            throw transactionError;
        }

        const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

        // Create Stripe Checkout Session for embedded checkout
        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded',
            mode: 'subscription',
            customer: customerId,
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            allow_promotion_codes: true,
            return_url: `${siteUrl}/auth/signup/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            subscription_data: {
                metadata: {
                    tenantId,
                    plan,
                    billingPeriod,
                    isSignup: 'true'
                },
            },
            metadata: {
                tenantId,
                plan,
                billingPeriod,
                isSignup: 'true'
            },
        });

        return NextResponse.json({
            clientSecret: session.client_secret,
            sessionId: session.id
        });

    } catch (error) {
        console.error('Signup checkout error:', error);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}

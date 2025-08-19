import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { transaction } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { Plan } from '@/lib/limits';
import { QueryResult } from 'pg';
import { generateUniqueSlug } from '@/lib/slug';
import Stripe from 'stripe';

export const runtime = 'nodejs';

function getStripePriceId(plan: Exclude<Plan, 'none'>, billingPeriod: 'monthly' | 'yearly'): string {
    const priceIds = {
        starter: {
            monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
            yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
        },
        pro: {
            monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
            yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
        },
        agency: {
            monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || '',
            yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || '',
        },
    };
    return priceIds[plan][billingPeriod];
}

export async function POST(req: NextRequest) {
    try {
        const { plan, billingPeriod, couponCode } = (await req.json()) as {
            plan: Plan;
            billingPeriod: 'monthly' | 'yearly';
            couponCode?: string;
        };

        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Not authenticated or no organization found' }, { status: 401 });
        }
        if (!plan || plan === 'none' || !['starter', 'pro', 'agency'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }
        if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
            return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
        }

        let setupIntent: Stripe.SetupIntent;
        let couponApplied: boolean;
        let discountAmount: number;

        try {
            // Lookup or create tenant, ensure a Stripe customer, and create SetupIntent (all in transaction)
            const result = await transaction(async (txQuery) => {
                // First try to find existing tenant
                const tenantResult = await txQuery(
                    'SELECT id, name, stripe_customer_id FROM public.tenants WHERE clerk_org_id = $1 FOR UPDATE',
                    [orgId]
                ) as QueryResult<{ id: string; name: string; stripe_customer_id: string | null }>;

                let tenant: { id: string; name: string; stripe_customer_id: string | null };

                if (tenantResult.rows.length === 0) {
                    // Tenant doesn't exist, create it synchronously
                    console.log('Creating tenant for organization during checkout:', orgId);

                    const clerk = await clerkClient();
                    const organization = await clerk.organizations.getOrganization({ organizationId: orgId });

                    if (!organization) {
                        throw new Error('Organization not found in Clerk');
                    }

                    // Generate unique slug
                    const uniqueSlug = await generateUniqueSlug(organization.name);

                    // Create the tenant (handle possible race via ON CONFLICT)
                    const createResult = await txQuery(
                        `INSERT INTO public.tenants (id, clerk_org_id, name, slug, public_key, secret_key, plan, plan_status, created_at, updated_at)
                         VALUES (gen_random_uuid(), $1, $2, $3,
                                 'hn_pk_' || encode(gen_random_bytes(18), 'base64'),
                                 'hn_sk_' || encode(gen_random_bytes(24), 'base64'),
                                 'none', 'inactive', now(), now())
                         ON CONFLICT (clerk_org_id) DO NOTHING
                         RETURNING id, name`,
                        [orgId, organization.name, uniqueSlug]
                    ) as QueryResult<{ id: string; name: string }>;

                    if (createResult.rows.length === 0) {
                        // Another transaction created it; select it now (row locked by FOR UPDATE at top)
                        const already = await txQuery(
                            'SELECT id, name, stripe_customer_id FROM public.tenants WHERE clerk_org_id = $1',
                            [orgId]
                        ) as QueryResult<{ id: string; name: string; stripe_customer_id: string | null }>;
                        if (already.rows.length === 0) throw new Error('Tenant creation race – tenant missing after conflict');
                        tenant = already.rows[0];
                    } else {
                        tenant = {
                            id: createResult.rows[0].id,
                            name: createResult.rows[0].name,
                            stripe_customer_id: null,
                        };
                    }

                    console.log('Created tenant:', tenant.id, 'for organization:', organization.name);
                } else {
                    tenant = tenantResult.rows[0];
                }

                let customerId = tenant.stripe_customer_id;
                if (!customerId) {
                    // Double-check within transaction to prevent race conditions
                    const refreshedTenant = await txQuery(
                        'SELECT stripe_customer_id FROM public.tenants WHERE id = $1',
                        [tenant.id]
                    ) as QueryResult<{ stripe_customer_id: string | null }>;

                    customerId = refreshedTenant.rows[0]?.stripe_customer_id;

                    if (!customerId) {
                        console.log('Creating Stripe customer for tenant:', tenant.id);

                        const clerk = await clerkClient();
                        const user = await clerk.users.getUser(userId);
                        const primaryEmail =
                            user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || undefined;
                        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;

                        const customer = await stripe.customers.create({
                            email: primaryEmail,
                            name,
                            metadata: { tenantId: tenant.id, orgId, userId, clerkUserId: userId },
                        }, { idempotencyKey: `tenant:${tenant.id}:customer:v1` });
                        customerId = customer.id;

                        // Update the tenant with the customer ID atomically
                        await txQuery(
                            'UPDATE public.tenants SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL',
                            [customerId, tenant.id]
                        );

                        console.log('Created and stored Stripe customer:', customerId, 'for tenant:', tenant.id);
                    } else {
                        console.log('Found existing Stripe customer:', customerId, 'for tenant:', tenant.id);
                    }
                }

                // Resolve price and validate promotion code within the same transaction context
                const priceId = getStripePriceId(plan as Exclude<Plan, 'none'>, billingPeriod);
                if (!priceId) {
                    throw new Error('Missing Stripe price ID for plan/period');
                }

                // Pull price to compute a display-only discount
                const price = await stripe.prices.retrieve(priceId);
                if (!price.unit_amount) {
                    throw new Error('Price does not have a unit amount');
                }

                // Validate promotion code (optional) and compute discount
                let couponValid = false;
                let discountAmount = 0;
                let validPromotionCodeId: string | undefined;

                if (couponCode?.trim()) {
                    const found = await stripe.promotionCodes.list({ code: couponCode.trim(), limit: 1 });
                    const pc = found.data[0];
                    if (pc && pc.active) {
                        const now = Math.floor(Date.now() / 1000);
                        const notExpired = !pc.expires_at || pc.expires_at > now;
                        const notMaxed = !pc.max_redemptions || (pc.times_redeemed ?? 0) < pc.max_redemptions;
                        couponValid = notExpired && notMaxed;
                        if (couponValid) {
                            validPromotionCodeId = pc.id;
                            const c = pc.coupon;
                            if (c.percent_off) {
                                discountAmount = Math.round((price.unit_amount * c.percent_off) / 100);
                            } else if (c.amount_off) {
                                discountAmount = c.amount_off;
                            }
                        }
                    }
                }

                // Create SetupIntent with the verified customer ID (still within transaction context)
                const couponKey = validPromotionCodeId ? validPromotionCodeId : 'none';
                const setupIntent = await stripe.setupIntents.create({
                    customer: customerId,
                    payment_method_types: ['card'],
                    usage: 'off_session',
                    metadata: {
                        tenantId: tenant.id,
                        orgId,
                        userId,
                        plan,
                        billingPeriod,
                        priceId,
                        ...(couponValid && { promotionCode: validPromotionCodeId! }),
                        context: couponValid ? 'signup_with_discount' : 'signup',
                    },
                }, { idempotencyKey: `tenant:${tenant.id}:setup:${plan}:${billingPeriod}:${couponKey}:v1` });

                return {
                    customerId,
                    tenantId: tenant.id,
                    setupIntent,
                    couponValid,
                    discountAmount
                };
            });

            setupIntent = result.setupIntent;
            couponApplied = result.couponValid;
            discountAmount = result.discountAmount;
        } catch (transactionError) {
            console.error('Transaction error in create-checkout:', transactionError);
            if (transactionError instanceof Error) {
                if (transactionError.message === 'Organization not found in Clerk') {
                    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
                }
            }
            throw transactionError;
        }

        return NextResponse.json({
            clientSecret: setupIntent.client_secret,
            setupIntentId: setupIntent.id,
            isSetupIntent: true,
            couponApplied,
            discountAmount,
        });
    } catch (error) {
        console.error('Checkout creation error:', error);
        return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
    }
}

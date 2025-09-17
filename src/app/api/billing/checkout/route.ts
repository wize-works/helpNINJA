import { NextRequest, NextResponse } from 'next/server';
import { stripe, Plan } from '@/lib/stripe';
import { transaction, query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { hasRole } from '@/lib/rbac';
import { logAuditEvent, extractRequestInfo } from '@/lib/audit-log';
import { auth } from '@clerk/nextjs/server';
import { QueryResult } from 'pg';

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
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = await transaction(async (txQuery) => {
            const result = await txQuery(
                'select id from public.users where clerk_user_id=$1',
                [clerkUserId]
            ) as QueryResult<{ id: string }>;
            if (!result.rows.length) throw new Error('user not found');
            return result.rows[0].id;
        });

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { plan, billingPeriod = 'monthly' } = (await req.json()) as {
            plan: Plan;
            billingPeriod?: 'monthly' | 'yearly';
        };

        if (!plan || !(plan in { starter: true, pro: true, agency: true })) {
            return NextResponse.json({ error: 'Valid plan required' }, { status: 400 });
        }

        if (billingPeriod && !['monthly', 'yearly'].includes(billingPeriod)) {
            return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
        }

        const tenantId = await getTenantIdStrict();
        if (!tenantId) {
            return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
        }

        // Require admin or owner role to manage billing
        const roleCheck = await hasRole(userId, tenantId, ['admin', 'owner']);
        if (!roleCheck.hasAccess) {
            return NextResponse.json({ error: roleCheck.reason || 'Insufficient permissions to manage billing' }, { status: 403 });
        }

        const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

        const customerId = await transaction(async (txQuery) => {
            const result = await txQuery(
                'select stripe_customer_id, name from public.tenants where id=$1 for update',
                [tenantId]
            ) as QueryResult<{ stripe_customer_id: string | null; name: string | null }>;

            if (!result.rows.length) throw new Error('tenant not found');

            let customerId = result.rows[0].stripe_customer_id || undefined;
            if (!customerId) {
                const cust = await stripe.customers.create(
                    { metadata: { tenantId } },
                    { idempotencyKey: `tenant:${tenantId}:customer:v1` }
                );
                customerId = cust.id;
                await txQuery('update public.tenants set stripe_customer_id=$1 where id=$2 and stripe_customer_id is null', [customerId, tenantId]);
            }

            return customerId;
        });

        // Get the appropriate price ID for the plan and billing period
        const priceId = getStripePriceId(plan as Exclude<Plan, 'none'>, billingPeriod);
        if (!priceId) {
            console.error(`Price not available for plan: ${plan}, billingPeriod: ${billingPeriod}`);
            console.error('Available environment variables:', {
                starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
                starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
                pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
                pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
                agency_monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY,
                agency_yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY,
            });
            return NextResponse.json({
                error: `Price not available for ${plan} plan with ${billingPeriod} billing. Please contact support.`
            }, { status: 400 });
        }

        // If tenant already has an active subscription, update it in-app (no new subscription)
        const { rows: subRows } = await query<{ stripe_subscription_id: string | null; plan_status: string | null }>(
            'select stripe_subscription_id, plan_status from public.tenants where id=$1',
            [tenantId]
        );
        const existingSubId = subRows[0]?.stripe_subscription_id;
        const existingStatus = (subRows[0]?.plan_status || '').toLowerCase();
        const hasActiveSub = !!existingSubId && existingStatus && existingStatus !== 'canceled';

        if (hasActiveSub) {
            const sub = await stripe.subscriptions.retrieve(existingSubId!);
            const firstItem = sub.items.data[0];
            if (!firstItem?.id) {
                return NextResponse.json({ error: 'Subscription item missing; contact support' }, { status: 400 });
            }

            await stripe.subscriptions.update(existingSubId!, {
                items: [
                    {
                        id: firstItem.id,
                        price: priceId,
                        quantity: 1,
                    },
                ],
                proration_behavior: 'create_prorations',
                metadata: { tenantId, plan, billingPeriod },
            });

            const updated = await stripe.subscriptions.retrieve(existingSubId!);
            const cpe = (updated as unknown as { current_period_end?: number }).current_period_end ?? 0;
            const periodEnd = new Date(cpe * 1000).toISOString();
            const status = updated.status;
            await query(
                `update public.tenants set plan=$1, plan_status=$2, current_period_end=$3 where id=$4`,
                [plan, status, periodEnd, tenantId]
            );

            await logAuditEvent({
                tenantId,
                userId,
                action: 'plan_changed',
                resourceType: 'subscription',
                resourceId: existingSubId!,
                metadata: {
                    fromStatus: existingStatus,
                    toPlan: plan,
                    billingPeriod,
                    ...extractRequestInfo(req)
                }
            });

            // Keep client contract by returning a URL to navigate
            return NextResponse.json({ url: `${siteUrl}/dashboard/billing?updated=1` });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
            success_url: `${siteUrl}/dashboard/billing?success=1`,
            cancel_url: `${siteUrl}/dashboard/billing?canceled=1`,
            subscription_data: {
                metadata: { tenantId, plan, billingPeriod },
            },
            metadata: { tenantId, plan, billingPeriod },
        });

        // Log audit event
        await logAuditEvent({
            tenantId,
            userId,
            action: 'subscription_created',
            resourceType: 'subscription',
            resourceId: session.id,
            metadata: {
                plan,
                billingPeriod,
                stripeSessionId: session.id,
                customerId,
                ...extractRequestInfo(req)
            }
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        if (error instanceof Error && error.message === 'tenant not found') {
            return NextResponse.json({ error: 'tenant not found' }, { status: 404 });
        }
        console.error('Billing checkout error:', error);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}

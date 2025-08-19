import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { sessionId } = (await req.json()) as { sessionId: string };

        // Get the authenticated user and organization
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Not authenticated or no organization found' }, { status: 401 });
        }

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
        }

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 404 });
        }

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
        }

        // Get tenant ID from metadata
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;
        const billingPeriod = session.metadata?.billingPeriod;

        if (!tenantId || !plan) {
            return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 });
        }

        // Verify the tenant belongs to this organization
        const tenantResult = await query<{ id: string }>(
            'SELECT id FROM public.tenants WHERE id = $1 AND clerk_org_id = $2',
            [tenantId, orgId]
        );

        if (tenantResult.rows.length === 0) {
            return NextResponse.json({ error: 'Tenant not found or unauthorized' }, { status: 404 });
        }

        // Update the tenant's subscription status
        await query(
            `UPDATE public.tenants 
             SET plan = $1, 
                 plan_status = 'active', 
                 billing_period = $2,
                 stripe_subscription_id = $3,
                 updated_at = now() 
             WHERE id = $4`,
            [plan, billingPeriod || 'monthly', session.subscription, tenantId]
        );

        return NextResponse.json({
            success: true,
            message: 'Payment verified and subscription activated'
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
}

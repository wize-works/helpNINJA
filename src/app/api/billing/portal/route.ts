import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { hasRole } from '@/lib/rbac';
import { logAuditEvent, extractRequestInfo } from '@/lib/audit-log';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = await getTenantIdStrict();
        if (!tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Require admin or owner role to access billing portal
        const roleCheck = await hasRole(userId, tenantId, ['admin', 'owner']);
        if (!roleCheck.hasAccess) {
            return NextResponse.json({ error: roleCheck.reason || 'Insufficient permissions to access billing' }, { status: 403 });
        }

        const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
        const { rows } = await query<{ stripe_customer_id: string | null }>(
            'select stripe_customer_id from public.tenants where id=$1',
            [tenantId]
        );
        const customer = rows[0]?.stripe_customer_id;
        if (!customer) {
            return NextResponse.json({ error: 'No Stripe customer on file' }, { status: 400 });
        }

        const portal = await stripe.billingPortal.sessions.create({
            customer,
            return_url: `${siteUrl}/dashboard/billing`,
        });

        // Log audit event
        await logAuditEvent({
            tenantId,
            userId,
            action: 'billing_portal_accessed',
            resourceType: 'billing',
            resourceId: customer,
            metadata: {
                portalSessionId: portal.id,
                customerId: customer,
                ...extractRequestInfo(req)
            }
        });

        return NextResponse.json({ url: portal.url });
    } catch (error) {
        console.error('Billing portal error:', error);
        return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
    }
}

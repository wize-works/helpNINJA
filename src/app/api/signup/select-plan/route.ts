import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { Plan } from '@/lib/limits';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { generateUniqueSlug } from '@/lib/slug';
import { QueryResult } from 'pg';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const { plan, billingPeriod } = (await req.json()) as {
            plan: Plan;
            billingPeriod: 'monthly' | 'yearly';
        };

        // During signup, we need to get the tenant ID from the Clerk organization
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

        // Get or create the tenant from the Clerk organization
        const tenantId = await transaction(async (txQuery) => {
            // First, try to find existing tenant
            const tenantResult = await txQuery(
                'SELECT id FROM public.tenants WHERE clerk_org_id = $1',
                [orgId]
            ) as QueryResult<{ id: string }>;

            if (tenantResult.rows.length > 0) {
                // Tenant exists, return its ID
                return tenantResult.rows[0].id;
            }

            // Tenant doesn't exist, create it synchronously
            console.log('Creating tenant for organization:', orgId);

            // Get organization details from Clerk
            const clerk = await clerkClient();
            const organization = await clerk.organizations.getOrganization({ organizationId: orgId });

            if (!organization) {
                throw new Error('Organization not found in Clerk');
            }

            // Generate unique slug
            const uniqueSlug = await generateUniqueSlug(organization.name);

            // Create the tenant
            const createResult = await txQuery(
                `INSERT INTO public.tenants (id, clerk_org_id, name, slug, public_key, secret_key, plan, plan_status, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, 
                         'hn_pk_' || encode(gen_random_bytes(18), 'base64'), 
                         'hn_sk_' || encode(gen_random_bytes(24), 'base64'),
                         'none', 'inactive', now(), now())
                 RETURNING id`,
                [orgId, organization.name, uniqueSlug]
            ) as QueryResult<{ id: string }>;

            const newTenantId = createResult.rows[0].id;
            console.log('Created tenant:', newTenantId, 'for organization:', organization.name);

            return newTenantId;
        });

        // Update the tenant's plan (this will be trial initially until they complete billing)
        await transaction(async (txQuery) => {
            await txQuery(
                `UPDATE public.tenants 
                 SET plan = $1, plan_status = 'trialing', updated_at = now() 
                 WHERE id = $2`,
                [plan, tenantId]
            );
        });

        return NextResponse.json({
            success: true,
            message: 'Plan selected successfully. You can complete billing setup later.',
            plan,
            billingPeriod
        });

    } catch (error) {
        console.error('Plan selection error:', error);
        return NextResponse.json({ error: 'Failed to select plan' }, { status: 500 });
    }
}

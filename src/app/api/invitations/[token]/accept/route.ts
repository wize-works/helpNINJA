import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { createClerkClient } from '@clerk/backend';

export const runtime = 'nodejs';

/**
 * Complete invitation acceptance flow:
 * 1. Validate invitation token
 * 2. Create Clerk user account
 * 3. Add user to Clerk organization
 * 4. Create internal user record
 * 5. Add user to tenant membership
 * 6. Mark invitation as completed
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const body = await req.json();
        const { firstName, lastName, password } = body;

        if (!token) {
            return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
        }

        if (!firstName || !lastName || !password) {
            return NextResponse.json({
                error: 'First name, last name, and password are required'
            }, { status: 400 });
        }

        // Get invitation details with tenant and clerk_org_id
        const { rows } = await query(`
            SELECT 
                tmi.id,
                tmi.tenant_id,
                tmi.email,
                tmi.role,
                tmi.expires_at,
                tmi.status,
                tmi.accepted_at,
                t.name as tenant_name,
                t.clerk_org_id
            FROM public.tenant_member_invitations tmi
            JOIN public.tenants t ON t.id = tmi.tenant_id
            WHERE tmi.token = $1
        `, [token]);

        if (rows.length === 0) {
            return NextResponse.json({
                error: 'Invitation not found',
                code: 'INVITATION_NOT_FOUND'
            }, { status: 404 });
        }

        const invitation = rows[0];

        // Validate invitation status
        if (invitation.status !== 'pending') {
            return NextResponse.json({
                error: `Invitation has already been ${invitation.status}`,
                code: 'ALREADY_PROCESSED',
                status: invitation.status
            }, { status: 400 });
        }

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < now) {
            return NextResponse.json({
                error: 'Invitation has expired',
                code: 'EXPIRED'
            }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id, clerk_user_id FROM public.users WHERE email = $1',
            [invitation.email]
        );

        let userId: string;
        let clerkUserId: string;

        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

        if (existingUser.rows.length > 0) {
            // User exists - use existing user
            userId = existingUser.rows[0].id;
            clerkUserId = existingUser.rows[0].clerk_user_id;
        } else {
            // Create new Clerk user

            try {
                const clerkUser = await clerk.users.createUser({
                    emailAddress: [invitation.email],
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    password,
                    skipPasswordChecks: false,
                    skipPasswordRequirement: false
                });

                clerkUserId = clerkUser.id;

                // Create internal user record
                const userResult = await query(
                    `INSERT INTO public.users (email, first_name, last_name, clerk_user_id, avatar_url)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                    [invitation.email, firstName.trim(), lastName.trim(), clerkUserId, clerkUser.imageUrl || null]
                );

                userId = userResult.rows[0].id;

            } catch (clerkError: unknown) {
                console.error('❌ Failed to create Clerk user:', clerkError);
                return NextResponse.json({
                    error: 'Failed to create user account',
                    details: clerkError instanceof Error ? clerkError.message : 'Unknown error'
                }, { status: 500 });
            }
        }

        // Add user to Clerk organization if clerk_org_id exists
        if (invitation.clerk_org_id) {
            try {

                // Step 1: Validate organization exists
                let organization;
                try {
                    organization = await clerk.organizations.getOrganization({
                        organizationId: invitation.clerk_org_id
                    });
                } catch (orgError) {
                    console.error(`❌ Organization ${invitation.clerk_org_id} not found or inaccessible:`, orgError);
                    throw new Error(`Organization not found: ${invitation.clerk_org_id}`);
                }

                // Step 2: Check if user already has membership
                let existingMembership;
                try {
                    const memberships = await clerk.organizations.getOrganizationMembershipList({
                        organizationId: invitation.clerk_org_id,
                        userId: [clerkUserId],
                        limit: 1
                    });
                    existingMembership = memberships.data.find(m => m.publicUserData?.userId === clerkUserId);
                } catch (membershipCheckError) {
                    console.log(`ℹ️ Could not check existing membership (will attempt creation):`, membershipCheckError);
                }

                if (existingMembership) {
                    console.log(`ℹ️ User ${clerkUserId} already has membership in organization:`, {
                        membershipId: existingMembership.id,
                        role: existingMembership.role
                    });
                } else {
                    // Step 3: Create membership only if needed
                    try {
                        const membership = await clerk.organizations.createOrganizationMembership({
                            organizationId: invitation.clerk_org_id,
                            userId: clerkUserId,
                            role: invitation.role === 'admin' ? 'org:admin' : 'org:member'
                        });
                    } catch (clerkOrgError: unknown) {
                        console.error('⚠️ Failed to add user to Clerk organization:', {
                            error: clerkOrgError,
                            organizationId: invitation.clerk_org_id,
                            userId: clerkUserId,
                            errorMessage: clerkOrgError instanceof Error ? clerkOrgError.message : String(clerkOrgError)
                        });
                    }
                }

            } catch (clerkOrgError: unknown) {
                console.error('⚠️ Failed to add user to Clerk organization:', {
                    error: clerkOrgError,
                    organizationId: invitation.clerk_org_id,
                    userId: clerkUserId,
                    errorMessage: clerkOrgError instanceof Error ? clerkOrgError.message : String(clerkOrgError)
                });
                // Continue - don't fail the whole process
            }
        } else {
            console.log(`ℹ️ No clerk_org_id found for tenant ${invitation.tenant_id}, skipping Clerk organization`);
        }

        // Start database transaction for the remaining operations
        await query('BEGIN');

        try {
            // Create tenant membership
            await query(
                `INSERT INTO public.tenant_members (tenant_id, user_id, role, status, joined_at)
                 VALUES ($1, $2, $3, 'active', NOW())
                 ON CONFLICT (tenant_id, user_id) DO UPDATE SET 
                    role = EXCLUDED.role, 
                    status = 'active', 
                    joined_at = COALESCE(public.tenant_members.joined_at, NOW())`,
                [invitation.tenant_id, userId, invitation.role]
            );

            // Mark invitation as completed
            await query(
                `UPDATE public.tenant_member_invitations 
                 SET status = 'completed', 
                     accepted_at = NOW(), 
                     first_name = $2, 
                     last_name = $3,
                     updated_at = NOW()
                 WHERE id = $1`,
                [invitation.id, firstName.trim(), lastName.trim()]
            );

            // Log activity
            await query(
                `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
                 VALUES ($1, $2, 'invitation_completed', 'invitation', $3, $4)`,
                [invitation.tenant_id, userId, invitation.id, JSON.stringify({
                    email: invitation.email,
                    role: invitation.role,
                    clerk_user_id: clerkUserId,
                    clerk_org_id: invitation.clerk_org_id || null
                })]
            );

            // Commit transaction
            await query('COMMIT');

            return NextResponse.json({
                success: true,
                message: 'Invitation accepted successfully',
                user: {
                    id: userId,
                    email: invitation.email,
                    first_name: firstName,
                    last_name: lastName,
                    clerk_user_id: clerkUserId
                },
                tenant: {
                    id: invitation.tenant_id,
                    name: invitation.tenant_name,
                    role: invitation.role
                },
                next_action: 'redirect_to_signin',
                signin_url: '/auth/signin'
            });

        } catch (dbError) {
            await query('ROLLBACK');
            console.error('❌ Database transaction failed:', dbError);
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Invitation acceptance failed:', error);
        return NextResponse.json({
            error: 'Failed to accept invitation',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
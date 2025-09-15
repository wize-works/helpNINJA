import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }


        // Get the internal user ID from Clerk user ID
        const userResult = await query(
            'SELECT id, email FROM public.users WHERE clerk_user_id = $1',
            [userId]
        );

        if (!userResult.rows.length) {
            console.error('❌ No internal user found for Clerk user:', userId);
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        const internalUser = userResult.rows[0];
        const userEmail = internalUser.email.toLowerCase();

        // Check if user already has tenant memberships
        const membershipCheck = await query(
            'SELECT tenant_id, role FROM public.tenant_members WHERE user_id = $1',
            [internalUser.id]
        );

        if (membershipCheck.rows.length > 0) {
            return NextResponse.json({
                message: 'User already has memberships',
                redirect: '/dashboard',
                note: 'User already has tenant memberships'
            });
        }

        // Check for accepted invitations that haven't been completed
        const acceptedInvitations = await query(
            `SELECT tmi.id, tmi.tenant_id, tmi.role, tmi.status
             FROM public.tenant_member_invitations tmi
             WHERE tmi.email = $1 AND tmi.status = 'accepted' AND tmi.completed_at IS NULL`,
            [userEmail]
        );

        if (acceptedInvitations.rows.length === 0) {
            return NextResponse.json({
                message: 'No pending invitations',
                redirect: '/dashboard/new'
            });
        }

        for (const invitation of acceptedInvitations.rows) {
            try {
                // Create the actual tenant membership
                const membershipResult = await query(
                    `INSERT INTO public.tenant_members (tenant_id, user_id, role, status, joined_at)
                     VALUES ($1, $2, $3, 'active', NOW())
                     ON CONFLICT (tenant_id, user_id) DO UPDATE SET 
                        role = EXCLUDED.role, 
                        status = 'active', 
                        joined_at = COALESCE(public.tenant_members.joined_at, NOW())
                     RETURNING tenant_id, user_id`,
                    [invitation.tenant_id, internalUser.id, invitation.role]
                );

                if (membershipResult.rows.length > 0) {
                    console.log(`✅ Created tenant membership for user ${membershipResult.rows[0].user_id} in tenant ${membershipResult.rows[0].tenant_id}`);
                }

                // Mark invitation as completed
                await query(
                    'UPDATE public.tenant_member_invitations SET status = \'completed\', completed_at = NOW() WHERE id = $1',
                    [invitation.id]
                );

                // Log activity
                await query(
                    `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
                     VALUES ($1, $2, 'invitation_completed', 'invitation', $3, $4)`,
                    [invitation.tenant_id, internalUser.id, invitation.id, JSON.stringify({
                        email: userEmail,
                        role: invitation.role,
                        source: 'manual_processing',
                        clerk_user_id: userId
                    })]
                );

            } catch (invitationError) {
                console.error(`❌ Failed to process invitation ${invitation.id}:`, invitationError);
                // Continue with next invitation even if this one fails
            }
        }

        // Return success with redirect to dashboard
        return NextResponse.json({
            message: 'Invitations processed successfully',
            redirect: '/dashboard',
            processed_count: acceptedInvitations.rows.length
        });

    } catch (error) {
        console.error('❌ Error processing invitations:', error);
        return NextResponse.json({ error: 'Failed to process invitations' }, { status: 500 });
    }
}
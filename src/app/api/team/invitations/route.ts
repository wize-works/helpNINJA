import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { sendTeamInvitationEmail } from '@/lib/emails/team-invitation';
import { canInviteUserWithRole } from '@/lib/team-permissions';
import { resolveCurrentUserId } from '@/lib/user-mapping';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const tenantId = await getTenantIdStrict();

        const { rows } = await query(`
            SELECT 
                tmi.id,
                tmi.email,
                tmi.role,
                tmi.token,
                tmi.expires_at,
                tmi.status,
                tmi.accepted_at,
                tmi.created_at,
                u.email as invited_by_email,
                u.first_name as invited_by_first_name,
                u.last_name as invited_by_last_name
            FROM public.tenant_member_invitations tmi
            JOIN public.users u ON u.id = tmi.invited_by
            WHERE tmi.tenant_id = $1 AND tmi.status IN ('pending', 'accepted')
            ORDER BY tmi.created_at DESC
        `, [tenantId]);

        const invitations = rows.map(row => ({
            id: row.id,
            email: row.email,
            role: row.role,
            token: row.token,
            expires_at: row.expires_at,
            status: row.status,
            accepted_at: row.accepted_at,
            created_at: row.created_at,
            invited_by_name: row.invited_by_first_name && row.invited_by_last_name
                ? `${row.invited_by_first_name} ${row.invited_by_last_name}`
                : row.invited_by_email,
            is_expired: new Date(row.expires_at) < new Date()
        }));

        return NextResponse.json(invitations);
    } catch (error) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Resolve Clerk user ID to internal UUID
        const currentUserId = await resolveCurrentUserId(clerkUserId);
        const tenantId = await getTenantIdStrict();
        const body = await req.json();
        const { email, role, message, firstName, lastName } = body;

        if (!email?.trim() || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
        }

        // Validate role
        const validRoles = ['admin', 'analyst', 'support', 'viewer'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Check if current user can invite with this role
        const permissionCheck = await canInviteUserWithRole(currentUserId, tenantId, role);
        if (!permissionCheck.allowed) {
            return NextResponse.json({
                error: permissionCheck.reason,
                code: 'INSUFFICIENT_PERMISSIONS',
                max_assignable_role: permissionCheck.maxRole
            }, { status: 403 });
        }

        const emailLower = email.trim().toLowerCase();

        // Check if user already exists in this tenant
        const existingMember = await query(
            `SELECT tm.user_id, tm.role, tm.status 
             FROM public.tenant_members tm
             JOIN public.users u ON u.id = tm.user_id
             WHERE tm.tenant_id = $1 AND u.email = $2`,
            [tenantId, emailLower]
        );

        if (existingMember.rows.length > 0) {
            const member = existingMember.rows[0];
            return NextResponse.json({
                error: `User is already a ${member.role} with status: ${member.status}`,
                code: 'USER_ALREADY_MEMBER',
                existing_role: member.role,
                existing_status: member.status
            }, { status: 400 });
        }

        // Check for existing pending invitation
        const existingInvitation = await query(
            'SELECT id, expires_at, status FROM public.tenant_member_invitations WHERE tenant_id = $1 AND email = $2 AND status IN (\'pending\', \'accepted\')',
            [tenantId, emailLower]
        );

        if (existingInvitation.rows.length > 0) {
            const invitation = existingInvitation.rows[0];
            const expiresAt = new Date(invitation.expires_at);
            if (expiresAt > new Date()) {
                return NextResponse.json({
                    error: `User already has a ${invitation.status} invitation`,
                    code: 'PENDING_INVITATION_EXISTS',
                    expires_at: invitation.expires_at,
                    status: invitation.status
                }, { status: 400 });
            } else {
                // Mark expired invitation as expired
                await query('UPDATE public.tenant_member_invitations SET status = \'expired\' WHERE id = $1', [invitation.id]);
            }
        }

        // Use proper transaction helper to ensure connection consistency
        try {
            const result = await transaction(async (txQuery) => {
                // Generate secure token
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

                // Create invitation
                console.log('🔍 About to insert invitation with values:', {
                    tenantId, emailLower, firstName, lastName, role, currentUserId, token, expiresAt, message
                });

                const invitationResult = await txQuery(
                    `INSERT INTO public.tenant_member_invitations (tenant_id, email, first_name, last_name, role, invited_by, token, expires_at, message, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') 
                     RETURNING id`,
                    [tenantId, emailLower, firstName, lastName, role, currentUserId, token, expiresAt, message]
                );

                const invitationId = invitationResult.rows[0].id;
                console.log('✅ Invitation INSERT returned ID:', invitationId);

                // Get tenant and inviter info for the email
                const [tenantResult, inviterResult] = await Promise.all([
                    txQuery('SELECT name FROM public.tenants WHERE id = $1', [tenantId]),
                    txQuery('SELECT first_name, last_name, email FROM public.users WHERE id = $1', [currentUserId])
                ]);

                const tenantName = tenantResult.rows[0]?.name || 'Your Team';
                const inviter = inviterResult.rows[0];
                const invitedByName = inviter?.first_name && inviter?.last_name
                    ? `${inviter.first_name} ${inviter.last_name}`
                    : inviter?.email || 'A team member';

                // Send invitation email
                const emailResult = await sendTeamInvitationEmail({
                    email: emailLower,
                    token,
                    role,
                    tenantName,
                    invitedByName,
                    message,
                    expiresAt
                });

                // Log activity regardless of email success
                try {
                    await txQuery(
                        `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
                         VALUES ($1, $2, 'invitation_sent', 'invitation', $3, $4)`,
                        [tenantId, currentUserId, invitationId, JSON.stringify({
                            email,
                            role,
                            message,
                            email_sent: emailResult.ok,
                            email_error: emailResult.ok ? null : emailResult.error
                        })]
                    );
                } catch (logError) {
                    console.error('Failed to log invitation activity:', logError);
                }

                console.log('✅ Transaction will auto-commit, returning data for invitation:', invitationId);

                return {
                    invitationId,
                    emailResult,
                    expiresAt
                };
            });

            if (!result.emailResult.ok) {
                // Log the email failure but don't fail the invitation creation
                console.error('Failed to send invitation email:', result.emailResult.error);
            }

            return NextResponse.json({
                message: result.emailResult.ok
                    ? 'Invitation sent successfully'
                    : 'Invitation created but email delivery failed',
                invitation_id: result.invitationId,
                email_sent: result.emailResult.ok,
                email_id: result.emailResult.id,
                expires_at: result.expiresAt,
                warning: !result.emailResult.ok ? 'Email delivery failed. You may need to manually share the invitation link.' : null
            });

        } catch (transactionError) {
            console.error('❌ Transaction error occurred:', transactionError);
            return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error sending invitation:', error);
        return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { searchParams } = new URL(req.url);
        const invitationId = searchParams.get('id');

        if (!invitationId) {
            return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
        }

        // Check if invitation exists and belongs to tenant
        const checkResult = await query(
            'SELECT id, email, status FROM public.tenant_member_invitations WHERE id = $1 AND tenant_id = $2',
            [invitationId, tenantId]
        );

        if (checkResult.rowCount === 0) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        const invitation = checkResult.rows[0];

        // Update invitation to cancelled status
        await query('UPDATE public.tenant_member_invitations SET status = \'cancelled\', updated_at = NOW() WHERE id = $1', [invitationId]);

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'invitation_cancelled', 'invitation', $3, $4)`,
            [tenantId, null, invitationId, JSON.stringify({ email: invitation.email })]
        );

        return NextResponse.json({ message: 'Invitation cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling invitation:', error);
        return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const body = await req.json();
        const { invitationId, action } = body;

        if (!invitationId || action !== 'resend') {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Check if invitation exists and belongs to tenant
        const invitationResult = await query(
            `SELECT tmi.id, tmi.email, tmi.role, tmi.expires_at, tmi.invited_by, tmi.status,
                    u.first_name, u.last_name, u.email as inviter_email
             FROM public.tenant_member_invitations tmi
             JOIN public.users u ON u.id = tmi.invited_by
             WHERE tmi.id = $1 AND tmi.tenant_id = $2 AND tmi.status IN ('pending', 'accepted')`,
            [invitationId, tenantId]
        );

        if (invitationResult.rowCount === 0) {
            return NextResponse.json({ error: 'Invitation not found or already completed/cancelled' }, { status: 404 });
        }

        const invitation = invitationResult.rows[0];

        // Generate new token and extend expiry
        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

        // Update invitation with new token and expiry
        await query(
            'UPDATE public.tenant_member_invitations SET token = $1, expires_at = $2, updated_at = NOW() WHERE id = $3',
            [newToken, newExpiresAt, invitationId]
        );

        // Get tenant name for the email
        const tenantResult = await query('SELECT name FROM public.tenants WHERE id = $1', [tenantId]);
        const tenantName = tenantResult.rows[0]?.name || 'Your Team';

        const invitedByName = invitation.first_name && invitation.last_name
            ? `${invitation.first_name} ${invitation.last_name}`
            : invitation.inviter_email;

        // Send new invitation email
        const emailResult = await sendTeamInvitationEmail({
            email: invitation.email,
            token: newToken,
            role: invitation.role,
            tenantName,
            invitedByName,
            message: 'This is a resent invitation to join our team.',
            expiresAt: newExpiresAt
        });

        if (!emailResult.ok) {
            console.error('Failed to resend invitation email:', emailResult.error);
        }

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'invitation_resent', 'invitation', $3, $4)`,
            [tenantId, invitation.invited_by, invitationId, JSON.stringify({
                email: invitation.email,
                role: invitation.role,
                email_sent: emailResult.ok
            })]
        );

        return NextResponse.json({
            message: emailResult.ok
                ? 'Invitation resent successfully'
                : 'Invitation updated but email delivery failed',
            email_sent: emailResult.ok,
            email_id: emailResult.id,
            expires_at: newExpiresAt
        });
    } catch (error) {
        console.error('Error resending invitation:', error);
        return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
    }
}

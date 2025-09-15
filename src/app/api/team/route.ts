import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { hasRole } from '@/lib/rbac';
import { logAuditEvent, extractRequestInfo } from '@/lib/audit-log';
import { resolveCurrentUserId } from '@/lib/user-mapping';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { userId: clerkUserId } = await auth();
        if (!clerkUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Resolve Clerk user ID to internal UUID
        const userId = await resolveCurrentUserId(clerkUserId);
        const tenantId = await getTenantIdStrict();

        // Require admin or owner role to view team members
        const roleCheck = await hasRole(userId, tenantId, ['admin', 'owner']);
        if (!roleCheck.hasAccess) {
            return NextResponse.json({ error: roleCheck.reason || 'Insufficient permissions' }, { status: 403 });
        }

        // Log audit event
        await logAuditEvent({
            tenantId,
            userId,
            action: 'team_member_viewed',
            resourceType: 'team',
            resourceId: tenantId,
            metadata: extractRequestInfo(request)
        });

        const { rows } = await query(`
            SELECT 
                tm.user_id,
                tm.role,
                tm.status,
                tm.invited_by,
                tm.invited_at,
                tm.joined_at,
                tm.last_active_at,
                u.email,
                u.first_name,
                u.last_name,
                u.avatar_url,
                u.created_at as user_created_at,
                inviter.email as invited_by_email,
                inviter.first_name as invited_by_first_name,
                inviter.last_name as invited_by_last_name
            FROM public.tenant_members tm
            JOIN public.users u ON u.id = tm.user_id
            LEFT JOIN public.users inviter ON inviter.id = tm.invited_by
            WHERE tm.tenant_id = $1
            ORDER BY 
                CASE tm.role 
                    WHEN 'owner' THEN 1 
                    WHEN 'admin' THEN 2 
                    WHEN 'analyst' THEN 3 
                    WHEN 'support' THEN 4 
                    WHEN 'viewer' THEN 5 
                END,
                tm.joined_at ASC NULLS LAST,
                u.email ASC
        `, [tenantId]);

        const members = rows.map(row => ({
            user_id: row.user_id,
            email: row.email,
            first_name: row.first_name,
            last_name: row.last_name,
            avatar_url: row.avatar_url,
            role: row.role,
            status: row.status,
            invited_by: row.invited_by,
            invited_by_name: row.invited_by_first_name && row.invited_by_last_name
                ? `${row.invited_by_first_name} ${row.invited_by_last_name}`
                : row.invited_by_email,
            invited_at: row.invited_at,
            joined_at: row.joined_at,
            last_active_at: row.last_active_at,
            user_created_at: row.user_created_at
        }));

        return NextResponse.json(members);
    } catch (error) {
        console.error('Error fetching team members:', error);
        return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
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

        // Require admin or owner role to add team members
        const roleCheck = await hasRole(currentUserId, tenantId, ['admin', 'owner']);
        if (!roleCheck.hasAccess) {
            return NextResponse.json({ error: roleCheck.reason || 'Insufficient permissions' }, { status: 403 });
        }

        const body = await req.json();
        const { email, role, firstName, lastName } = body;

        if (!email?.trim() || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
        }

        // Validate role
        const validRoles = ['admin', 'analyst', 'support', 'viewer'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Check if user already exists in this tenant
        const existingMember = await query(
            `SELECT tm.user_id, tm.role, tm.status 
             FROM public.tenant_members tm
             JOIN public.users u ON u.id = tm.user_id
             WHERE tm.tenant_id = $1 AND u.email = $2`,
            [tenantId, email.trim().toLowerCase()]
        );

        if (existingMember.rows.length > 0) {
            const member = existingMember.rows[0];
            return NextResponse.json({
                error: `User is already a ${member.role} with status: ${member.status}`
            }, { status: 400 });
        }

        // Check for existing invitation
        const existingInvitation = await query(
            'SELECT id, expires_at FROM public.tenant_member_invitations WHERE tenant_id = $1 AND email = $2 AND accepted_at IS NULL',
            [tenantId, email.trim().toLowerCase()]
        );

        if (existingInvitation.rows.length > 0) {
            const invitation = existingInvitation.rows[0];
            const expiresAt = new Date(invitation.expires_at);
            if (expiresAt > new Date()) {
                return NextResponse.json({
                    error: 'User already has a pending invitation'
                }, { status: 400 });
            } else {
                // Delete expired invitation
                await query('DELETE FROM public.tenant_member_invitations WHERE id = $1', [invitation.id]);
            }
        }

        // Create or get user
        let userId: string;
        const userResult = await query('SELECT id FROM public.users WHERE email = $1', [email.trim().toLowerCase()]);

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;

            // Update user info if provided
            if (firstName || lastName) {
                await query(
                    'UPDATE public.users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3',
                    [firstName?.trim() || null, lastName?.trim() || null, userId]
                );
            }
        } else {
            // Create new user
            const newUserResult = await query(
                'INSERT INTO public.users (email, first_name, last_name) VALUES ($1, $2, $3) RETURNING id',
                [email.trim().toLowerCase(), firstName?.trim() || null, lastName?.trim() || null]
            );
            userId = newUserResult.rows[0].id;
        }

        // For demo purposes, we'll add them directly as active
        // In a real implementation, this would send an invitation email
        await query(
            `INSERT INTO public.tenant_members (tenant_id, user_id, role, status, joined_at) 
             VALUES ($1, $2, $3, 'active', NOW())`,
            [tenantId, userId, role]
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'user_added', 'user', $3, $4)`,
            [tenantId, currentUserId, userId, JSON.stringify({ email, role, method: 'direct_add' })]
        );

        // Log audit event
        await logAuditEvent({
            tenantId,
            userId: currentUserId,
            action: 'team_member_invited',
            resourceType: 'team_member',
            resourceId: userId,
            metadata: {
                email,
                role,
                firstName,
                lastName,
                method: 'direct_add',
                ...extractRequestInfo(req)
            }
        });

        return NextResponse.json({
            message: 'Team member added successfully',
            user_id: userId
        });
    } catch (error) {
        console.error('Error adding team member:', error);
        return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';
import { canManageUser, type Role } from '@/lib/permissions';

export const runtime = 'nodejs';

type Context = { params: Promise<{ userId: string }> };

export async function GET(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { userId } = await ctx.params;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

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
            WHERE tm.tenant_id = $1 AND tm.user_id = $2
        `, [tenantId, userId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        const member = rows[0];
        return NextResponse.json({
            user_id: member.user_id,
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name,
            avatar_url: member.avatar_url,
            role: member.role,
            status: member.status,
            invited_by: member.invited_by,
            invited_by_name: member.invited_by_first_name && member.invited_by_last_name
                ? `${member.invited_by_first_name} ${member.invited_by_last_name}`
                : member.invited_by_email,
            invited_at: member.invited_at,
            joined_at: member.joined_at,
            last_active_at: member.last_active_at,
            user_created_at: member.user_created_at
        });
    } catch (error) {
        console.error('Error fetching team member:', error);
        return NextResponse.json({ error: 'Failed to fetch team member' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { userId } = await ctx.params;
        const body = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const { role, status, firstName, lastName } = body;

        // Get current member info
        const currentMember = await query(
            'SELECT role, status FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2',
            [tenantId, userId]
        );

        if (currentMember.rows.length === 0) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        const current = currentMember.rows[0];

        // Prevent changing owner role or changing to owner
        if (current.role === 'owner' || role === 'owner') {
            return NextResponse.json({
                error: 'Cannot modify owner role'
            }, { status: 403 });
        }

        // Update tenant member
        const memberUpdates: string[] = [];
        const memberParams: unknown[] = [tenantId, userId];
        let paramIndex = 3;

        if (role !== undefined) {
            const validRoles = ['admin', 'analyst', 'support', 'viewer'];
            if (!validRoles.includes(role)) {
                return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
            }
            memberUpdates.push(`role = $${paramIndex++}`);
            memberParams.push(role);
        }

        if (status !== undefined) {
            const validStatuses = ['active', 'suspended'];
            if (!validStatuses.includes(status)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }
            memberUpdates.push(`status = $${paramIndex++}`);
            memberParams.push(status);
        }

        if (memberUpdates.length > 0) {
            await query(
                `UPDATE public.tenant_members SET ${memberUpdates.join(', ')} WHERE tenant_id = $1 AND user_id = $2`,
                memberParams
            );
        }

        // Update user info if provided
        const userUpdates: string[] = [];
        const userParams: unknown[] = [userId];
        let userParamIndex = 2;

        if (firstName !== undefined) {
            userUpdates.push(`first_name = $${userParamIndex++}`);
            userParams.push(firstName?.trim() || null);
        }

        if (lastName !== undefined) {
            userUpdates.push(`last_name = $${userParamIndex++}`);
            userParams.push(lastName?.trim() || null);
        }

        if (userUpdates.length > 0) {
            userUpdates.push('updated_at = NOW()');
            await query(
                `UPDATE public.users SET ${userUpdates.join(', ')} WHERE id = $1`,
                userParams
            );
        }

        // Log activity
        const changes: Record<string, unknown> = {};
        if (role !== current.role) changes.role = { from: current.role, to: role };
        if (status !== current.status) changes.status = { from: current.status, to: status };
        if (firstName !== undefined || lastName !== undefined) {
            changes.profile = { firstName, lastName };
        }

        if (Object.keys(changes).length > 0) {
            await query(
                `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
                 VALUES ($1, $2, 'user_updated', 'user', $3, $4)`,
                [tenantId, null, userId, JSON.stringify(changes)]
            );
        }

        return NextResponse.json({ message: 'Team member updated successfully' });
    } catch (error) {
        console.error('Error updating team member:', error);
        return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { userId } = await ctx.params;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Check if member exists and get their role
        const memberResult = await query(
            'SELECT role, status FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2',
            [tenantId, userId]
        );

        if (memberResult.rows.length === 0) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        const member = memberResult.rows[0];

        // Prevent removing owner
        if (member.role === 'owner') {
            return NextResponse.json({
                error: 'Cannot remove owner from team'
            }, { status: 403 });
        }

        // Check if this is the last admin (if removing an admin)
        if (member.role === 'admin') {
            const adminCount = await query(
                'SELECT COUNT(*) as count FROM public.tenant_members WHERE tenant_id = $1 AND role IN ($2, $3) AND status = $4',
                [tenantId, 'owner', 'admin', 'active']
            );

            if (parseInt(adminCount.rows[0].count) <= 1) {
                return NextResponse.json({
                    error: 'Cannot remove the last admin from the team'
                }, { status: 403 });
            }
        }

        // Remove member
        await query(
            'DELETE FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2',
            [tenantId, userId]
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'user_removed', 'user', $3, $4)`,
            [tenantId, null, userId, JSON.stringify({ role: member.role, status: member.status })]
        );

        return NextResponse.json({ message: 'Team member removed successfully' });
    } catch (error) {
        console.error('Error removing team member:', error);
        return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

        if (!token) {
            return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
        }

        // Get invitation details
        const { rows } = await query(`
            SELECT 
                ti.id,
                ti.tenant_id,
                ti.email,
                ti.role,
                ti.expires_at,
                ti.accepted_at,
                t.name as tenant_name,
                u.email as invited_by_email,
                u.first_name as invited_by_first_name,
                u.last_name as invited_by_last_name
            FROM public.team_invitations ti
            JOIN public.tenants t ON t.id = ti.tenant_id
            JOIN public.users u ON u.id = ti.invited_by
            WHERE ti.token = $1
        `, [token]);

        if (rows.length === 0) {
            return NextResponse.json({
                error: 'Invitation not found',
                code: 'INVITATION_NOT_FOUND'
            }, { status: 404 });
        }

        const invitation = rows[0];

        // Check if already accepted
        if (invitation.accepted_at) {
            return NextResponse.json({
                error: 'Invitation has already been accepted',
                code: 'ALREADY_ACCEPTED',
                accepted_at: invitation.accepted_at
            }, { status: 400 });
        }

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(invitation.expires_at);
        if (expiresAt < now) {
            return NextResponse.json({
                error: 'Invitation has expired',
                code: 'EXPIRED',
                expires_at: invitation.expires_at
            }, { status: 400 });
        }

        // Return invitation details for the frontend to display
        return NextResponse.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                tenant_name: invitation.tenant_name,
                invited_by: invitation.invited_by_first_name && invitation.invited_by_last_name
                    ? `${invitation.invited_by_first_name} ${invitation.invited_by_last_name}`
                    : invitation.invited_by_email,
                expires_at: invitation.expires_at
            }
        });

    } catch (error) {
        console.error('Error fetching invitation:', error);
        return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        const body = await req.json();
        const { firstName, lastName } = body;

        if (!token) {
            return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 });
        }

        // Get invitation details
        const { rows } = await query(`
            SELECT 
                ti.id,
                ti.tenant_id,
                ti.email,
                ti.role,
                ti.expires_at,
                ti.accepted_at
            FROM public.team_invitations ti
            WHERE ti.token = $1
        `, [token]);

        if (rows.length === 0) {
            return NextResponse.json({
                error: 'Invitation not found',
                code: 'INVITATION_NOT_FOUND'
            }, { status: 404 });
        }

        const invitation = rows[0];

        // Check if already accepted
        if (invitation.accepted_at) {
            return NextResponse.json({
                error: 'Invitation has already been accepted',
                code: 'ALREADY_ACCEPTED'
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
        let userId: string;
        const existingUser = await query(
            'SELECT id FROM public.users WHERE email = $1',
            [invitation.email]
        );

        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;

            // Update user info if provided
            if (firstName || lastName) {
                await query(
                    'UPDATE public.users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), updated_at = NOW() WHERE id = $3',
                    [firstName?.trim() || null, lastName?.trim() || null, userId]
                );
            }
        } else {
            // Create new user
            const newUserResult = await query(
                'INSERT INTO public.users (email, first_name, last_name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
                [invitation.email, firstName?.trim() || null, lastName?.trim() || null]
            );
            userId = newUserResult.rows[0].id;
        }

        // Check if user is already a member of this tenant
        const existingMember = await query(
            'SELECT id FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2',
            [invitation.tenant_id, userId]
        );

        if (existingMember.rows.length === 0) {
            // Add user to tenant
            await query(
                'INSERT INTO public.tenant_members (tenant_id, user_id, role, status, joined_at) VALUES ($1, $2, $3, $4, NOW())',
                [invitation.tenant_id, userId, invitation.role, 'active']
            );
        } else {
            // Update existing membership
            await query(
                'UPDATE public.tenant_members SET role = $1, status = $2, joined_at = COALESCE(joined_at, NOW()) WHERE tenant_id = $3 AND user_id = $4',
                [invitation.role, 'active', invitation.tenant_id, userId]
            );
        }

        // Mark invitation as accepted
        await query(
            'UPDATE public.team_invitations SET accepted_at = NOW() WHERE id = $1',
            [invitation.id]
        );

        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'invitation_accepted', 'invitation', $3, $4)`,
            [invitation.tenant_id, userId, invitation.id, JSON.stringify({
                email: invitation.email,
                role: invitation.role
            })]
        );

        return NextResponse.json({
            message: 'Invitation accepted successfully',
            user_id: userId,
            tenant_id: invitation.tenant_id,
            role: invitation.role
        });

    } catch (error) {
        console.error('Error accepting invitation:', error);
        return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }
}

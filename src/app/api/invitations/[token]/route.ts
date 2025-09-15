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
                t.clerk_org_id,
                u.email as invited_by_email,
                u.first_name as invited_by_first_name,
                u.last_name as invited_by_last_name
            FROM tenant_member_invitations ti
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
    const { token } = await params;
    return NextResponse.json(
        {
            error: 'This endpoint is deprecated. Use /api/invitations/[token]/accept instead.',
            code: 'DEPRECATED_ENDPOINT',
            next: `/api/invitations/${token}/accept`,
        },
        { status: 410 }
    );
}

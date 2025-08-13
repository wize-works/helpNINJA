import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        
        const { rows } = await query(`
            SELECT 
                ti.id,
                ti.email,
                ti.role,
                ti.token,
                ti.expires_at,
                ti.accepted_at,
                ti.created_at,
                u.email as invited_by_email,
                u.first_name as invited_by_first_name,
                u.last_name as invited_by_last_name
            FROM public.team_invitations ti
            JOIN public.users u ON u.id = ti.invited_by
            WHERE ti.tenant_id = $1 AND ti.accepted_at IS NULL
            ORDER BY ti.created_at DESC
        `, [tenantId]);
        
        const invitations = rows.map(row => ({
            id: row.id,
            email: row.email,
            role: row.role,
            token: row.token,
            expires_at: row.expires_at,
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
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const body = await req.json();
        const { email, role, message } = body;
        
        if (!email?.trim() || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
        }
        
        // Validate role
        const validRoles = ['admin', 'analyst', 'support', 'viewer'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
                error: `User is already a ${member.role} with status: ${member.status}` 
            }, { status: 400 });
        }
        
        // Check for existing pending invitation
        const existingInvitation = await query(
            'SELECT id, expires_at FROM public.team_invitations WHERE tenant_id = $1 AND email = $2 AND accepted_at IS NULL',
            [tenantId, emailLower]
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
                await query('DELETE FROM public.team_invitations WHERE id = $1', [invitation.id]);
            }
        }
        
        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
        
        // For demo purposes, we'll use a placeholder invited_by user
        // In a real implementation, this would come from the authenticated user
        const invitedBy = await query('SELECT id FROM public.users LIMIT 1');
        const invitedByUserId = invitedBy.rows[0]?.id;
        
        if (!invitedByUserId) {
            return NextResponse.json({ error: 'No valid user found to send invitation' }, { status: 500 });
        }
        
        // Create invitation
        const { rows } = await query(
            `INSERT INTO public.team_invitations (tenant_id, email, role, invited_by, token, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id`,
            [tenantId, emailLower, role, invitedByUserId, token, expiresAt]
        );
        
        const invitationId = rows[0].id;
        
        // In a real implementation, you would send an email here
        // await sendInvitationEmail(email, token, role, tenantName, message);
        
        // Log activity
        await query(
            `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'invitation_sent', 'invitation', $3, $4)`,
            [tenantId, invitedByUserId, invitationId, JSON.stringify({ email, role, message })]
        );
        
        return NextResponse.json({ 
            message: 'Invitation sent successfully',
            invitation_id: invitationId,
            token, // For demo purposes - normally this would only be in the email
            expires_at: expiresAt
        });
    } catch (error) {
        console.error('Error sending invitation:', error);
        return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { searchParams } = new URL(req.url);
        const invitationId = searchParams.get('id');
        
        if (!invitationId) {
            return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
        }
        
        // Check if invitation exists and belongs to tenant
        const checkResult = await query(
            'SELECT id, email FROM public.team_invitations WHERE id = $1 AND tenant_id = $2',
            [invitationId, tenantId]
        );
        
        if (checkResult.rowCount === 0) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }
        
        const invitation = checkResult.rows[0];
        
        // Delete invitation
        await query('DELETE FROM public.team_invitations WHERE id = $1', [invitationId]);
        
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

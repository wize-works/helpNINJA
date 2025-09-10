import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

interface ShareToken {
    id: string;
    conversation_id: string;
    token: string;
    expires_at: string;
    created_at: string;
}

/**
 * Generate a shareable link for a conversation
 */
export async function POST(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { conversationId, expiresInDays = 30 } = await req.json();

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        }

        // Verify conversation exists and belongs to tenant
        const conversationCheck = await query<{ id: string }>(
            'SELECT id FROM public.conversations WHERE id = $1 AND tenant_id = $2',
            [conversationId, tenantId]
        );

        if (!conversationCheck.rows[0]) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Check if share already exists (update expiry if it does)
        const existingShare = await query<ShareToken>(
            'SELECT * FROM public.conversation_shares WHERE conversation_id = $1 AND tenant_id = $2 AND expires_at > NOW()',
            [conversationId, tenantId]
        );

        let shareToken: string;

        if (existingShare.rows[0]) {
            // Update existing share with new expiry
            shareToken = existingShare.rows[0].token;
            await query(
                'UPDATE public.conversation_shares SET expires_at = NOW() + ($1 || \' days\')::INTERVAL, updated_at = NOW() WHERE id = $2',
                [expiresInDays.toString(), existingShare.rows[0].id]
            );
        } else {
            // Create new share token
            shareToken = randomBytes(32).toString('hex');
            await query(
                `INSERT INTO public.conversation_shares (tenant_id, conversation_id, token, expires_at)
                 VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL)`,
                [tenantId, conversationId, shareToken, expiresInDays.toString()]
            );
        }

        const baseUrl = process.env.SITE_URL || 'http://localhost:3001';
        const shareUrl = `${baseUrl}/shared/conversation/${shareToken}`;

        return NextResponse.json({
            shareUrl,
            token: shareToken,
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        });

    } catch (error) {
        console.error('Error generating share link:', error);
        return NextResponse.json(
            { error: 'Failed to generate share link' },
            { status: 500 }
        );
    }
}

/**
 * Revoke a shareable link for a conversation
 */
export async function DELETE(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { conversationId } = await req.json();

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        }

        // Delete all active shares for this conversation
        await query(
            'DELETE FROM public.conversation_shares WHERE conversation_id = $1 AND tenant_id = $2',
            [conversationId, tenantId]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error revoking share link:', error);
        return NextResponse.json(
            { error: 'Failed to revoke share link' },
            { status: 500 }
        );
    }
}

/**
 * Get share information for a conversation
 */
export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { searchParams } = new URL(req.url);
        const conversationId = searchParams.get('conversationId');

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
        }

        // Get active share for this conversation
        const shareResult = await query<ShareToken>(
            'SELECT * FROM public.conversation_shares WHERE conversation_id = $1 AND tenant_id = $2 AND expires_at > NOW()',
            [conversationId, tenantId]
        );

        if (!shareResult.rows[0]) {
            return NextResponse.json({ shared: false });
        }

        const share = shareResult.rows[0];
        const baseUrl = process.env.SITE_URL || 'http://localhost:3001';
        const shareUrl = `${baseUrl}/shared/conversation/${share.token}`;

        return NextResponse.json({
            shared: true,
            shareUrl,
            token: share.token,
            expiresAt: share.expires_at,
            createdAt: share.created_at
        });

    } catch (error) {
        console.error('Error getting share info:', error);
        return NextResponse.json(
            { error: 'Failed to get share information' },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const runtime = 'nodejs';

interface RespondRequest {
    message: string;
}

async function handleRespond(req: AuthenticatedRequest, ...args: unknown[]) {
    const { params } = args[0] as { params: Promise<{ id: string }> };
    try {
        const { id: conversationId } = await params;
        const { message } = await req.json() as RespondRequest;

        // Validate inputs
        if (!message?.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Get tenant ID and user ID from authenticated request
        const tenantId = req.tenantId;
        const agentId = req.userId; // Use the authenticated user's ID as the agent ID

        // Get conversation and validate tenant access
        const convo = await query<{ tenant_id: string; session_id: string; site_id: string | null }>(
            'SELECT tenant_id, session_id, site_id FROM public.conversations WHERE id = $1',
            [conversationId]
        );

        if (!convo.rows[0]) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const { tenant_id: convTenantId, session_id: sessionId, site_id: siteId } = convo.rows[0];

        // Verify tenant access
        if (convTenantId !== tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Insert human response message
        const messageResult = await query<{ id: string }>(
            `INSERT INTO public.messages (id, tenant_id, conversation_id, session_id, role, content, is_human_response, agent_id, site_id, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'assistant', $4, TRUE, $5, $6, NOW())
       RETURNING id`,
            [tenantId, conversationId, sessionId, message.trim(), agentId || null, siteId]
        );

        // Update conversation status to indicate human involvement
        await query(
            'UPDATE public.conversations SET status = $1, updated_at = NOW() WHERE id = $2',
            ['human_handling', conversationId]
        );

        return NextResponse.json({
            success: true,
            messageId: messageResult.rows[0].id,
            message: 'Response sent successfully'
        });

    } catch (error) {
        console.error('Agent response error:', error);
        return NextResponse.json({
            error: 'Failed to send response',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }, { status: 500 });
    }
}

// Export the authenticated handler
export const POST = withAuth(handleRespond);

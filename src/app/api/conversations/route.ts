import { NextResponse } from 'next/server';
import { requireApiKey, AuthenticatedRequest } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Create a new conversation via API - requires API key with 'chat' permission
 */
async function handleCreateConversation(req: AuthenticatedRequest) {
    try {
        const { tenantId } = req;
        const body = await req.json();

        const { session_id, metadata, site_id } = body;

        if (!session_id) {
            return NextResponse.json(
                { error: 'session_id is required' },
                { status: 400 }
            );
        }

        // Check if conversation already exists
        const existing = await query(
            'SELECT id FROM public.conversations WHERE tenant_id = $1 AND session_id = $2',
            [tenantId, session_id]
        );

        if (existing.rows.length > 0) {
            return NextResponse.json({
                conversation_id: existing.rows[0].id,
                session_id,
                status: 'existing'
            });
        }

        // Create new conversation
        const { rows } = await query(`
            INSERT INTO public.conversations (tenant_id, session_id, metadata${site_id ? ', site_id' : ''})
            VALUES ($1, $2, $3${site_id ? ', $4' : ''})
            RETURNING id, created_at
        `, site_id
            ? [tenantId, session_id, metadata ? JSON.stringify(metadata) : null, site_id]
            : [tenantId, session_id, metadata ? JSON.stringify(metadata) : null]);

        const conversation = rows[0];

        // Log API activity
        await query(`
      INSERT INTO public.api_usage_logs (
        api_key_id, 
        tenant_id, 
        endpoint,
        method,
        response_status,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
            req.apiKey!.id,
            tenantId,
            '/api/conversations',
            'POST',
            201,
            req.headers.get('x-forwarded-for') || 'unknown',
            req.headers.get('user-agent') || 'unknown'
        ]);

        return NextResponse.json({
            conversation_id: conversation.id,
            session_id,
            created_at: conversation.created_at,
            status: 'created'
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
        );
    }
}

/**
 * Get conversations for tenant - requires API key with 'chat' permission
 */
async function handleGetConversations(req: AuthenticatedRequest) {
    try {
        const { tenantId } = req;
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
        const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

        const { rows } = await query(`
      SELECT 
        c.id,
        c.session_id,
        c.metadata,
        c.created_at,
        c.updated_at,
        COUNT(m.id)::int as message_count,
        MAX(m.created_at) as last_message_at
      FROM public.conversations c
      LEFT JOIN public.messages m ON m.conversation_id = c.id
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.session_id, c.metadata, c.created_at, c.updated_at
      ORDER BY c.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [tenantId, limit, offset]);

        // Log API activity
        await query(`
      INSERT INTO public.api_usage_logs (
        api_key_id, 
        tenant_id, 
        endpoint,
        method,
        response_status,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
            req.apiKey!.id,
            tenantId,
            '/api/conversations',
            'GET',
            200,
            req.headers.get('x-forwarded-for') || 'unknown',
            req.headers.get('user-agent') || 'unknown'
        ]);

        return NextResponse.json({
            conversations: rows,
            pagination: {
                limit,
                offset,
                count: rows.length
            }
        });

    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

// Export the protected routes - API key required, no session fallback
export const POST = requireApiKey(['chat'])(handleCreateConversation);
export const GET = requireApiKey(['chat'])(handleGetConversations);

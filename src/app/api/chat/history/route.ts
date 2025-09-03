import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/chat/history
 * 
 * Retrieves conversation history for a given session
 * Used as fallback when localStorage is unavailable
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const tenantId = searchParams.get('tenantId');
        const limitParam = searchParams.get('limit');

        // Validate required parameters
        if (!sessionId) {
            return NextResponse.json(
                { error: 'sessionId is required' },
                { status: 400 }
            );
        }

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50; // Max 100 messages

        // Get tenant ID from public key
        const tenantResult = await query(
            'SELECT id FROM tenants WHERE public_key = $1',
            [tenantId]
        );

        if (tenantResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Invalid tenant' },
                { status: 401 }
            );
        }

        const internalTenantId = tenantResult.rows[0].id;

        // Get conversation for this session
        const conversationResult = await query(
            'SELECT id FROM conversations WHERE session_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1',
            [sessionId, internalTenantId]
        );

        if (conversationResult.rows.length === 0) {
            // No conversation found - return empty history
            return NextResponse.json({
                success: true,
                sessionId,
                messages: [],
                totalCount: 0,
                hasMore: false
            });
        }

        const conversationId = conversationResult.rows[0].id;

        // Get messages for this conversation
        const messagesResult = await query(`
      SELECT 
        id,
        role,
        content,
        created_at,
        confidence
      FROM messages 
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `, [conversationId, limit]);

        // Get total count for pagination info
        const countResult = await query(
            'SELECT COUNT(*) as total FROM messages WHERE conversation_id = $1',
            [conversationId]
        );

        const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);
        const hasMore = totalCount > limit;

        // Format messages for widget consumption
        const messages = messagesResult.rows.map(row => ({
            id: row.id,
            role: row.role,
            content: row.content,
            createdAt: row.created_at.toISOString(),
            ...(row.confidence !== null && { confidence: parseFloat(row.confidence) })
        }));

        // Set CORS headers for widget access
        const response = NextResponse.json({
            success: true,
            sessionId,
            messages,
            totalCount,
            hasMore
        });

        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return response;

    } catch (error) {
        console.error('Chat history error:', error);

        const response = NextResponse.json(
            { error: 'Failed to retrieve chat history' },
            { status: 500 }
        );

        // Still set CORS headers for error responses
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return response;
    }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}

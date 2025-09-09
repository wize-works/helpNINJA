import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

// CORS headers for widget cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(req: NextRequest) {
    try {
        const { sessionId, tenantId } = await req.json();

        if (!sessionId || !tenantId) {
            const errorResponse = NextResponse.json({
                error: 'Session ID and tenant ID are required'
            }, { status: 400 });

            Object.entries(corsHeaders).forEach(([key, value]) => {
                errorResponse.headers.set(key, value);
            });

            return errorResponse;
        }

        // Find the most recent conversation for this session
        const conversation = await query<{ id: string }>(
            'SELECT id FROM public.conversations WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
            [sessionId]
        );

        if (conversation.rows[0]) {
            const conversationId = conversation.rows[0].id;

            // Mark conversation as cleared/resolved
            await query(
                'UPDATE public.conversations SET status = $1, updated_at = NOW() WHERE id = $2',
                ['resolved', conversationId]
            );

            // Optionally, you could also soft-delete messages or mark them as archived
            // await query(
            //     'UPDATE public.messages SET archived = true WHERE conversation_id = $1',
            //     [conversationId]
            // );
        }

        const response = NextResponse.json({
            success: true,
            message: 'Chat cleared successfully'
        });

        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    } catch (error) {
        console.error('Clear chat error:', error);
        const errorResponse = NextResponse.json({
            error: 'Failed to clear chat',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }, { status: 500 });

        Object.entries(corsHeaders).forEach(([key, value]) => {
            errorResponse.headers.set(key, value);
        });

        return errorResponse;
    }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders
    });
}

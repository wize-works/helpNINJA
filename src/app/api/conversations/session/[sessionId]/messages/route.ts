import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

// CORS headers for widget cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');
    const { sessionId } = await params;

    try {
        let whereClause = 'session_id = $1';
        const queryParams: (string | null)[] = [sessionId];

        if (since) {
            whereClause += ' AND created_at > $2';
            queryParams.push(since);
        }

        const messages = await query<{
            id: string;
            role: string;
            content: string;
            created_at: string;
            is_human_response: boolean;
            confidence: number | null;
        }>(
            `SELECT id, role, content, created_at, 
              COALESCE(is_human_response, false) as is_human_response,
              confidence
       FROM public.messages 
       WHERE ${whereClause}
       ORDER BY created_at ASC`,
            queryParams
        );

        const response = NextResponse.json({ messages: messages.rows });

        // Add CORS headers
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;
    } catch (error) {
        console.error('Fetch messages error:', error);
        const errorResponse = NextResponse.json({
            error: 'Failed to fetch messages',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }, { status: 500 });

        // Add CORS headers to error response
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

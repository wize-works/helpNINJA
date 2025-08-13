import { NextResponse } from 'next/server';
import { requireApiKey, AuthenticatedRequest } from '@/lib/auth-middleware';
import { query } from '@/lib/db';
import { searchWithCuratedAnswers } from '@/lib/rag';
import { canSendMessage, incMessages } from '@/lib/usage';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const runtime = 'nodejs';

const SYSTEM = (voice = 'friendly') => `You are HelpNinja, a concise, helpful site assistant.
Use only the provided Context to answer. If unsure, say you don't know and offer to connect support.
Voice: ${voice}. Keep answers under 120 words. Include 1 link to the relevant page if useful.`;

async function ensureConversation(tenantId: string, sessionId: string) {
    const existing = await query<{ id: string }>('select id from public.conversations where tenant_id=$1 and session_id=$2 limit 1', [tenantId, sessionId]);
    if (existing.rows[0]?.id) return existing.rows[0].id;
    const ins = await query<{ id: string }>('insert into public.conversations (tenant_id, session_id) values ($1,$2) returning id', [tenantId, sessionId]);
    return ins.rows[0].id;
}

/**
 * Send a chat message via API - requires API key with 'chat' permission
 */
async function handleSendMessage(req: AuthenticatedRequest) {
    try {
        const { tenantId, apiKey } = req;

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                error: 'server_not_configured',
                message: 'OpenAI API key is not configured.'
            }, { status: 500 });
        }

        const body = await req.json();
        const { sessionId, message, voice, siteId } = body;

        if (!sessionId || !message) {
            return NextResponse.json({
                error: 'missing_fields',
                message: 'sessionId and message are required'
            }, { status: 400 });
        }

        // Check usage limits
        const gate = await canSendMessage(tenantId);
        if (!gate.ok) {
            return NextResponse.json({
                error: 'usage_limit_exceeded',
                message: gate.reason
            }, { status: 402 });
        }

        const conversationId = await ensureConversation(tenantId, sessionId);

        // Search for curated answers first, then RAG results
        const { curatedAnswers, ragResults } = await searchWithCuratedAnswers(tenantId, message, 6, siteId);

        let text: string;
        let confidence: number;
        let refs: string[] = [];
        let answerType: 'curated' | 'rag' = 'rag';

        if (curatedAnswers.length > 0) {
            // Use the highest-priority curated answer
            const bestAnswer = curatedAnswers[0];
            text = bestAnswer.answer;
            confidence = 0.95; // High confidence for curated answers
            refs = []; // Curated answers don't have URL refs
            answerType = 'curated';

            // Log that we used a curated answer
            await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                   values ($1, $2, 'user', $3, 1.0)`,
                [conversationId, tenantId, message]);
        } else {
            // Fall back to RAG + OpenAI
            const contextText = ragResults.map((c, i) => `[[${i + 1}]] ${c.url}\n${c.content}`).join('\n\n');
            refs = ragResults.map(c => c.url);

            const chat = await openai.chat.completions.create({
                model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM(voice) },
                    { role: 'user', content: `Question: ${message}\n\nContext:\n${contextText}` }
                ]
            });

            text = chat.choices[0]?.message?.content?.trim() || "I'm not sure. Want me to connect you with support?";
            confidence = chat.choices[0]?.finish_reason === 'stop' ? 0.7 : 0.4;

            // Log user message
            await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                   values ($1, $2, 'user', $3, 1.0)`,
                [conversationId, tenantId, message]);
        }

        // Log assistant response
        const assistantResult = await query<{ id: string }>(
            `insert into public.messages (conversation_id, tenant_id, role, content, confidence, sources)
       values ($1, $2, 'assistant', $3, $4, $5) returning id`,
            [conversationId, tenantId, text, confidence, refs.length > 0 ? JSON.stringify(refs) : null]
        );

        // Increment usage counter
        await incMessages(tenantId);

        // Log API usage
        await query(`
      INSERT INTO public.api_usage_logs (
        api_key_id, 
        tenant_id, 
        endpoint,
        method,
        response_status,
        ip_address,
        user_agent,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            apiKey!.id,
            tenantId,
            '/api/chat-api',
            'POST',
            200,
            req.headers.get('x-forwarded-for') || 'unknown',
            req.headers.get('user-agent') || 'unknown',
            JSON.stringify({
                conversation_id: conversationId,
                message_id: assistantResult.rows[0].id,
                answer_type: answerType,
                confidence: confidence,
                sources_count: refs.length
            })
        ]);

        return NextResponse.json({
            conversation_id: conversationId,
            message_id: assistantResult.rows[0].id,
            response: text,
            confidence: confidence,
            sources: refs,
            answer_type: answerType,
            session_id: sessionId
        });

    } catch (error) {
        console.error('Error processing chat message:', error);
        return NextResponse.json(
            { error: 'Failed to process message' },
            { status: 500 }
        );
    }
}

/**
 * Get conversation history - requires API key with 'chat' permission
 */
async function handleGetConversation(req: AuthenticatedRequest) {
    try {
        const { tenantId, apiKey } = req;
        const url = new URL(req.url);
        const conversationId = url.searchParams.get('conversation_id');
        const sessionId = url.searchParams.get('session_id');

        if (!conversationId && !sessionId) {
            return NextResponse.json({
                error: 'missing_parameter',
                message: 'Either conversation_id or session_id is required'
            }, { status: 400 });
        }

        let whereClause = 'WHERE c.tenant_id = $1';
        const params: unknown[] = [tenantId];

        if (conversationId) {
            whereClause += ' AND c.id = $2';
            params.push(conversationId);
        } else if (sessionId) {
            whereClause += ' AND c.session_id = $2';
            params.push(sessionId);
        }

        const { rows } = await query(`
      SELECT 
        c.id as conversation_id,
        c.session_id,
        c.created_at as conversation_created_at,
        c.metadata as conversation_metadata,
        json_agg(
          json_build_object(
            'id', m.id,
            'role', m.role,
            'content', m.content,
            'confidence', m.confidence,
            'sources', m.sources,
            'created_at', m.created_at
          ) ORDER BY m.created_at ASC
        ) FILTER (WHERE m.id IS NOT NULL) as messages
      FROM public.conversations c
      LEFT JOIN public.messages m ON m.conversation_id = c.id
      ${whereClause}
      GROUP BY c.id, c.session_id, c.created_at, c.metadata
      ORDER BY c.updated_at DESC
      LIMIT 1
    `, params);

        if (rows.length === 0) {
            return NextResponse.json({
                error: 'conversation_not_found',
                message: 'Conversation not found'
            }, { status: 404 });
        }

        const conversation = rows[0];

        // Log API usage
        await query(`
      INSERT INTO public.api_usage_logs (
        api_key_id, 
        tenant_id, 
        endpoint,
        method,
        response_status,
        ip_address,
        user_agent,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
            apiKey!.id,
            tenantId,
            '/api/chat-api',
            'GET',
            200,
            req.headers.get('x-forwarded-for') || 'unknown',
            req.headers.get('user-agent') || 'unknown',
            JSON.stringify({
                conversation_id: conversation.conversation_id,
                message_count: conversation.messages?.length || 0
            })
        ]);

        return NextResponse.json({
            conversation_id: conversation.conversation_id,
            session_id: conversation.session_id,
            created_at: conversation.conversation_created_at,
            metadata: conversation.conversation_metadata,
            messages: conversation.messages || []
        });

    } catch (error) {
        console.error('Error fetching conversation:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversation' },
            { status: 500 }
        );
    }
}

// Export the protected routes - API key required, no session fallback
export const POST = requireApiKey(['chat'])(handleSendMessage);
export const GET = requireApiKey(['chat'])(handleGetConversation);

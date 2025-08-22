import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchWithCuratedAnswers } from '@/lib/rag';
import { query } from '@/lib/db';
import { canSendMessage, incMessages } from '@/lib/usage';
// Note: Admin/dashboard no longer use header-based tenant resolution. The widget passes a public identifier in body.
import { webhookEvents } from '@/lib/webhooks';

export const runtime = 'nodejs';

function parseAllowedOrigins(): string[] | null {
    const raw = process.env.ALLOWED_WIDGET_ORIGINS;
    if (!raw) return null;
    return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function isOriginAllowed(origin: string | null, allowlist: string[] | null): boolean {
    if (!allowlist || allowlist.length === 0) return true; // permissive by default
    if (!origin) return false;
    return allowlist.includes(origin);
}

function corsHeaders(req: NextRequest) {
    const reqOrigin = req.headers.get('origin');
    const allowlist = parseAllowedOrigins();
    const allowed = isOriginAllowed(reqOrigin, allowlist);
    const origin = allowed ? (reqOrigin || '*') : 'null';
    return {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
        'vary': 'Origin'
    } as Record<string, string>;
}

export async function OPTIONS(req: NextRequest) {
    const allowlist = parseAllowedOrigins();
    const ok = isOriginAllowed(req.headers.get('origin'), allowlist);
    if (!ok) return new NextResponse(null, { status: 403, headers: corsHeaders(req) });
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

async function ensureConversation(tenantId: string, sessionId: string) {
    const existing = await query<{ id: string }>('select id from public.conversations where tenant_id=$1 and session_id=$2 limit 1', [tenantId, sessionId]);
    if (existing.rows[0]?.id) return existing.rows[0].id;

    // Create new conversation
    const ins = await query<{ id: string }>('insert into public.conversations (tenant_id, session_id) values ($1,$2) returning id', [tenantId, sessionId]);
    const conversationId = ins.rows[0].id;

    // Trigger conversation started webhook
    try {
        await webhookEvents.conversationStarted(tenantId, conversationId, sessionId);
    } catch (error) {
        console.error('Failed to trigger conversation.started webhook:', error);
    }

    return conversationId;
}

// Accept public identifiers from the widget and resolve to internal tenant UUID
async function resolveTenantInternalId(token: string | null): Promise<string | null> {
    const candidate = token;
    if (!candidate) return null;
    // If it's already a UUID, use as-is
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(candidate)) return candidate;
    // Otherwise, look up by public_key, secret_key, or slug
    const rs = await query<{ id: string }>(
        `select id from public.tenants where public_key = $1 or secret_key = $1 or slug = $1 limit 1`,
        [candidate]
    );
    return rs.rows[0]?.id || null;
}

const SYSTEM = (voice = 'friendly') => `
You are helpNINJA, a concise, helpful site assistant.

Rules:
- Use only the provided Context. If the answer isn’t in Context, say “I don’t know” and offer to connect support.
- Voice: ${voice}.
- Keep answers under 120 words.
- If useful, include ONE relevant link (markdown: [text](url)).
- Always format responses in a clean, scannable way:
  • Start with a direct answer in 1–2 sentences.
  • Follow with up to 2 bullet points for clarity or steps.
  • End with a supportive closing line (e.g., “Need more help? I can connect you to support.”).
`;

export async function POST(req: NextRequest) {
    const headersOut = corsHeaders(req);
    try {
        const allowlist = parseAllowedOrigins();
        const ok = isOriginAllowed(req.headers.get('origin'), allowlist);
        if (!ok) return NextResponse.json({ error: 'origin not allowed' }, { status: 403, headers: headersOut });

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'server_not_configured', message: 'OpenAI API key is not configured.' }, { status: 500, headers: headersOut });
        }

        const { tenantId: bodyTid, sessionId, message, voice } = await req.json();
        const tenantId = await resolveTenantInternalId(bodyTid);
        if (!tenantId) return NextResponse.json({ error: 'tenant_not_found', message: 'Unknown tenant identifier.' }, { status: 400, headers: headersOut });
        if (!sessionId || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400, headers: headersOut });

        const gate = await canSendMessage(tenantId);
        if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402, headers: headersOut });

        const conversationId = await ensureConversation(tenantId, sessionId);

        // Get site_id if available from widget referer or session context
        // For now, we'll pass undefined but this could be enhanced to detect the site
        const siteId = undefined; // TODO: Extract from widget context or session

        // Search for curated answers first, then RAG results
        const { curatedAnswers, ragResults } = await searchWithCuratedAnswers(tenantId, message, 6, siteId);

        let text: string;
        let confidence: number;
        let refs: string[] = [];

        if (curatedAnswers.length > 0) {
            // Use the highest-priority curated answer
            const bestAnswer = curatedAnswers[0];
            text = bestAnswer.answer;
            confidence = 0.95; // High confidence for curated answers
            refs = []; // Curated answers don't have URL refs

            // Log that we used a curated answer
            await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                         values ($1, $2, 'user', $3, 1.0)`,
                [conversationId, tenantId, message]);
        } else {
            // Fall back to RAG + OpenAI
            const contextText = ragResults.map((c, i) => `[[${i + 1}]] ${c.url}\n${c.content}`).join('\n\n');
            refs = ragResults.map(c => c.url);

            // Initialize OpenAI only when needed at runtime
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
            const userMessage = await query<{ id: string }>(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                         values ($1, $2, 'user', $3, 1.0) returning id`,
                [conversationId, tenantId, message]);

            // Trigger message sent webhook for user message
            try {
                console.log(`🔔 Chat API: Triggering message.sent webhook for user message ${userMessage.rows[0].id}`);
                await webhookEvents.messageSent(tenantId, conversationId, userMessage.rows[0].id, 'user');
                console.log(`✅ Chat API: message.sent webhook triggered successfully`);
            } catch (error) {
                console.error('💥 Chat API: Failed to trigger message.sent webhook for user:', error);
            }
        }

        const assistantMessage = await query<{ id: string }>(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
               values ($1, $2, 'assistant', $3, $4) returning id`,
            [conversationId, tenantId, text, confidence]);

        // Trigger message sent webhook for assistant response
        try {
            console.log(`🔔 Chat API: Triggering message.sent webhook for assistant message ${assistantMessage.rows[0].id}`);
            await webhookEvents.messageSent(tenantId, conversationId, assistantMessage.rows[0].id, 'assistant', confidence);
            console.log(`✅ Chat API: assistant message.sent webhook triggered successfully`);
        } catch (error) {
            console.error('💥 Chat API: Failed to trigger message.sent webhook for assistant:', error);
        }

        // Auto-escalate on low confidence or explicit handoff
        const threshold = 0.55;
        if ((confidence ?? 0) < threshold || /connect you with support/i.test(text)) {
            try {
                // Trigger escalation webhook
                await webhookEvents.escalationTriggered(
                    tenantId,
                    conversationId,
                    (confidence ?? 0) < threshold ? 'low_confidence' : 'handoff',
                    confidence
                );

                const base = process.env.SITE_URL || '';
                const url = base ? base.replace(/\/$/, '') + '/api/escalate' : 'http://localhost:3001/api/escalate';
                await fetch(url, {
                    method: 'POST', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        tenantId,
                        sessionId,
                        conversationId,
                        userMessage: message,
                        assistantAnswer: text,
                        confidence,
                        refs,
                        reason: (confidence ?? 0) < threshold ? 'low_confidence' : 'handoff',
                        usedCuratedAnswer: curatedAnswers.length > 0
                    })
                })
            } catch (error) {
                console.error('Failed to trigger escalation webhook or call escalate API:', error);
            }
        }

        await incMessages(tenantId);
        return NextResponse.json({
            answer: text,
            refs,
            confidence,
            source: curatedAnswers.length > 0 ? 'curated' : 'ai'
        }, { headers: headersOut });
    } catch (e) {
        // Don’t leak internal errors; keep message generic in production
        const dev = process.env.NODE_ENV !== 'production';
        return NextResponse.json({ error: 'internal_error', message: dev ? (e as Error).message : 'Unexpected server error.' }, { status: 500, headers: corsHeaders(req) });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchHybrid } from '@/lib/rag';
import { query } from '@/lib/db';
import { canSendMessage, incMessages } from '@/lib/usage';
import { resolveTenantIdFromRequest } from '@/lib/auth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const runtime = 'nodejs';

function corsHeaders(req: NextRequest) {
    const origin = req.headers.get('origin') || '*';
    return {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type,x-tenant-id,x-tenant,x-hn-tenant',
        'access-control-allow-methods': 'POST, OPTIONS',
        'vary': 'Origin'
    } as Record<string, string>;
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

async function ensureConversation(tenantId: string, sessionId: string) {
    const existing = await query<{ id: string }>('select id from public.conversations where tenant_id=$1 and session_id=$2 limit 1', [tenantId, sessionId]);
    if (existing.rows[0]?.id) return existing.rows[0].id;
    const ins = await query<{ id: string }>('insert into public.conversations (tenant_id, session_id) values ($1,$2) returning id', [tenantId, sessionId]);
    return ins.rows[0].id;
}

const SYSTEM = (voice = 'friendly') => `You are HelpNinja, a concise, helpful site assistant.
Use only the provided Context to answer. If unsure, say you don’t know and offer to connect support.
Voice: ${voice}. Keep answers under 120 words. Include 1 link to the relevant page if useful.`;

export async function POST(req: NextRequest) {
    const { tenantId: bodyTid, sessionId, message, voice } = await req.json();
    const tenantId = bodyTid || await resolveTenantIdFromRequest(req, true);
    if (!tenantId || !sessionId || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400, headers: corsHeaders(req) });

    const gate = await canSendMessage(tenantId);
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402, headers: corsHeaders(req) });

    const conversationId = await ensureConversation(tenantId, sessionId);

    const contexts = await searchHybrid(tenantId, message, 6);
    const contextText = contexts.map((c, i) => `[[${i + 1}]] ${c.url}\n${c.content}`).join('\n\n');

    const chat = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SYSTEM(voice) },
            { role: 'user', content: `Question: ${message}\n\nContext:\n${contextText}` }
        ]
    });

    const text = chat.choices[0]?.message?.content?.trim() || "I’m not sure. Want me to connect you with support?";
    const confidence = chat.choices[0]?.finish_reason === 'stop' ? 0.7 : 0.4;

    await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
               values ($1, $2, 'assistant', $3, $4)`,
        [conversationId, tenantId, text, confidence]);

    // Auto-escalate on low confidence or explicit handoff
    const threshold = 0.55;
    if ((confidence ?? 0) < threshold || /connect you with support/i.test(text)) {
        try {
            await fetch((process.env.SITE_URL || '') + '/api/escalate', {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ tenantId, sessionId, conversationId, userMessage: message, assistantAnswer: text, confidence, refs: contexts.map(c => c.url), reason: (confidence ?? 0) < threshold ? 'low_confidence' : 'handoff' })
            })
        } catch { }
    }

    await incMessages(tenantId);
    return NextResponse.json({ answer: text, refs: contexts.map(c => c.url), confidence }, { headers: corsHeaders(req) });
}

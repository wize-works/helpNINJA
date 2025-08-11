import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchHybrid } from '@/lib/rag';
import { query } from '@/lib/db';
import { canSendMessage, incMessages } from '@/lib/usage';
import { resolveTenantIdFromRequest } from '@/lib/auth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
        'access-control-allow-headers': 'content-type,x-tenant-id,x-tenant,x-hn-tenant',
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
    const ins = await query<{ id: string }>('insert into public.conversations (tenant_id, session_id) values ($1,$2) returning id', [tenantId, sessionId]);
    return ins.rows[0].id;
}

// Accept public identifiers from the widget and resolve to internal tenant UUID
async function resolveTenantInternalId(token: string | null, req: NextRequest): Promise<string | null> {
    const candidate = token || (await (async () => {
        try { return await resolveTenantIdFromRequest(req, true) } catch { return null }
    })());
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

const SYSTEM = (voice = 'friendly') => `You are HelpNinja, a concise, helpful site assistant.
Use only the provided Context to answer. If unsure, say you don’t know and offer to connect support.
Voice: ${voice}. Keep answers under 120 words. Include 1 link to the relevant page if useful.`;

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
        const tenantId = await resolveTenantInternalId(bodyTid, req);
        if (!tenantId) return NextResponse.json({ error: 'tenant_not_found', message: 'Unknown tenant identifier.' }, { status: 400, headers: headersOut });
        if (!sessionId || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400, headers: headersOut });

        const gate = await canSendMessage(tenantId);
        if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402, headers: headersOut });

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
                const base = process.env.SITE_URL || '';
                const url = base ? base.replace(/\/$/, '') + '/api/escalate' : 'http://localhost:3001/api/escalate';
                await fetch(url, {
                    method: 'POST', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ tenantId, sessionId, conversationId, userMessage: message, assistantAnswer: text, confidence, refs: contexts.map(c => c.url), reason: (confidence ?? 0) < threshold ? 'low_confidence' : 'handoff' })
                })
            } catch { }
        }

        await incMessages(tenantId);
        return NextResponse.json({ answer: text, refs: contexts.map(c => c.url), confidence }, { headers: headersOut });
    } catch (e) {
        // Don’t leak internal errors; keep message generic in production
        const dev = process.env.NODE_ENV !== 'production';
        return NextResponse.json({ error: 'internal_error', message: dev ? (e as Error).message : 'Unexpected server error.' }, { status: 500, headers: corsHeaders(req) });
    }
}

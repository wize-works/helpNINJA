import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { searchWithCuratedAnswers, type HybridResult } from '@/lib/rag';
import { query } from '@/lib/db';
import { canSendMessage, incMessages } from '@/lib/usage';
import { evaluateRuleConditions } from '@/lib/rule-engine';
// Note: Admin/dashboard no longer use header-based tenant resolution. The widget passes a public identifier in body.
import { webhookEvents } from '@/lib/webhooks';
import { extractKeywords } from '@/lib/extract-keywords';
import { handleEscalation } from '@/lib/escalation-service';
import { classifyIntent } from '@/lib/intents';
import type { EscalationDestination } from '@/lib/escalation-service';
import type { EscalationReason } from '@/lib/integrations/types';
import { renderMarkdownLiteToHtml } from '@/lib/markdown-lite-server';
import { logEvent } from '@/lib/events';

// Types for contact info handling
interface ContactInfo {
    name: string;
    contact_method: 'email' | 'phone' | 'slack';
    contact_value: string;
}

interface ContactInfoResponse {
    isContactInfo: boolean;
    contactInfo?: ContactInfo;
}

interface PendingEscalation {
    id: string;
    original_message: string;
    assistant_answer: string;
    confidence: number;
    refs?: string[];
    reason: EscalationReason;
    rule_id?: string | null;
    matched_rule_destinations?: EscalationDestination[] | null;
    keywords?: string[];
    trigger_webhooks: boolean;
    meta: Record<string, unknown>;
}

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

// Helper functions for contact info and escalation management

/**
 * Generates a friendly prompt asking the user for their contact information
 */
function generateContactInfoPrompt(): string {
    return "I'd like to connect you with our support team to help with this. To make sure they can reach you, could you please provide:\n\n1. Your name\n2. How you'd prefer to be contacted (email, phone, or Slack)\n3. Your contact details (email address or phone number)\n\nYou can format it like: \"My name is John Smith, I prefer email, john@example.com\"";
}

/**
 * Checks if a user message contains contact information in response to our prompt
 */
async function checkForContactInfoResponse(message: string, conversationId: string): Promise<ContactInfoResponse> {
    // Check if there's a pending escalation first
    let pendingEscalation: PendingEscalation | null = null;
    try {
        pendingEscalation = await getPendingEscalation(conversationId);
    } catch (error) {
        console.error('❌ Error in checkForContactInfoResponse, clearing corrupted data:', error);
        await clearPendingEscalation(conversationId);
        return { isContactInfo: false };
    }

    if (!pendingEscalation) {
        return { isContactInfo: false };
    }

    // Simple patterns to detect contact info
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phonePattern = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/;

    // More flexible name patterns
    const namePatterns = [
        /(?:my name is|i'm|i am|name:|call me)\s+([a-zA-Z\s]+)/i,
        /^([a-zA-Z]+\s+[a-zA-Z]+)(?:,|\s+and|\s+I)/i, // "John Smith, and I..." or "John Smith and I..."
        /^([a-zA-Z]+\s+[a-zA-Z]+)(?:\s+prefer|\s+would)/i // "John Smith prefer..." or "John Smith would..."
    ];

    const hasEmail = emailPattern.test(message);
    const hasPhone = phonePattern.test(message);

    // Check if it looks like contact info response (has email/phone + mentions preference or contact method)
    const mentionsContact = /\b(prefer|contact|email|phone|slack|reach|call|message)\b/i.test(message);

    if ((hasEmail || hasPhone) && mentionsContact) {
        const emailMatch = message.match(emailPattern);
        const phoneMatch = message.match(phonePattern);

        // Try to extract name using various patterns
        let name = '';
        let nameMatch = null;

        for (const pattern of namePatterns) {
            nameMatch = message.match(pattern);
            if (nameMatch) {
                name = nameMatch[1].trim();
                break;
            }
        }

        // If no specific pattern matched, try to extract a name from the beginning of the message
        if (!name) {
            const firstWordsMatch = message.match(/^([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/);
            if (firstWordsMatch) {
                name = firstWordsMatch[1].trim();
            }
        }

        if (!name) return { isContactInfo: false };
        let contactMethod: 'email' | 'phone' | 'slack' = 'email';
        let contactValue = '';

        // Determine preferred contact method based on what they provided and mentioned
        if (hasEmail && (message.toLowerCase().includes('email') || !hasPhone)) {
            contactMethod = 'email';
            contactValue = emailMatch![0];
        } else if (hasPhone) {
            contactMethod = 'phone';
            contactValue = phoneMatch![0];
        }

        // Check for Slack preference
        if (message.toLowerCase().includes('slack')) {
            contactMethod = 'slack';
            // For Slack, we might get an email or username
            contactValue = emailMatch ? emailMatch[0] : (phoneMatch ? phoneMatch[0] : name);
        }

        return {
            isContactInfo: true,
            contactInfo: {
                name,
                contact_method: contactMethod,
                contact_value: contactValue
            }
        };
    }

    return { isContactInfo: false };
}

/**
 * Stores contact information for a conversation
 */
async function storeContactInfo(conversationId: string, tenantId: string, contactInfo: ContactInfo): Promise<void> {
    await query(
        `INSERT INTO public.conversation_contact_info 
         (conversation_id, tenant_id, name, contact_method, contact_value, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (conversation_id) DO UPDATE SET
         name = EXCLUDED.name,
         contact_method = EXCLUDED.contact_method,
         contact_value = EXCLUDED.contact_value,
         updated_at = NOW()`,
        [conversationId, tenantId, contactInfo.name, contactInfo.contact_method, contactInfo.contact_value]
    );
}

/**
 * Retrieves contact information for a conversation
 */
async function getContactInfo(conversationId: string): Promise<ContactInfo | null> {
    const result = await query<ContactInfo>(
        `SELECT name, contact_method, contact_value FROM public.conversation_contact_info 
         WHERE conversation_id = $1`,
        [conversationId]
    );

    return result.rows[0] || null;
}

/**
 * Stores a pending escalation context to be processed after contact info is collected
 */
async function storePendingEscalation(conversationId: string, escalationContext: Omit<PendingEscalation, 'id'>): Promise<void> {
    await query(
        `INSERT INTO public.pending_escalations 
         (conversation_id, original_message, assistant_answer, confidence, refs, reason, 
          rule_id, matched_rule_destinations, keywords, trigger_webhooks, meta, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (conversation_id) DO UPDATE SET
         original_message = EXCLUDED.original_message,
         assistant_answer = EXCLUDED.assistant_answer,
         confidence = EXCLUDED.confidence,
         refs = EXCLUDED.refs,
         reason = EXCLUDED.reason,
         rule_id = EXCLUDED.rule_id,
         matched_rule_destinations = EXCLUDED.matched_rule_destinations,
         keywords = EXCLUDED.keywords,
         trigger_webhooks = EXCLUDED.trigger_webhooks,
         meta = EXCLUDED.meta,
         updated_at = NOW()`,
        [
            conversationId,
            escalationContext.original_message,
            escalationContext.assistant_answer,
            escalationContext.confidence,
            JSON.stringify(Array.isArray(escalationContext.refs) ? escalationContext.refs : []),
            escalationContext.reason,
            escalationContext.rule_id,
            JSON.stringify(escalationContext.matched_rule_destinations),
            JSON.stringify(Array.isArray(escalationContext.keywords) ? escalationContext.keywords : []),
            escalationContext.trigger_webhooks,
            JSON.stringify(escalationContext.meta || {})
        ]
    );
}

/**
 * Retrieves a pending escalation for a conversation
 */
async function getPendingEscalation(conversationId: string): Promise<PendingEscalation | null> {
    const result = await query<{
        id: string;
        original_message: string;
        assistant_answer: string;
        confidence: number;
        refs: string;
        reason: EscalationReason;
        rule_id: string | null;
        matched_rule_destinations: string;
        keywords: string;
        trigger_webhooks: boolean;
        meta: string;
    }>(
        `SELECT id, original_message, assistant_answer, confidence, refs, reason, 
         rule_id, matched_rule_destinations, keywords, trigger_webhooks, meta
         FROM public.pending_escalations 
         WHERE conversation_id = $1`,
        [conversationId]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];

    // Helper function to safely parse JSON with fallback
    function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
        if (!str) return fallback;

        try {
            // If it's already an object/array, return it
            if (typeof str === 'object') return str as T;

            // Try to parse as JSON
            return JSON.parse(str);
        } catch {
            console.warn('Failed to parse JSON, using fallback. Input:', typeof str, str?.substring(0, 100) + '...');

            // If it looks like an array but isn't valid JSON, try to handle it
            if (typeof str === 'string') {
                // Handle array-like strings that aren't valid JSON
                if (str.startsWith('[') && str.includes('http')) {
                    // Looks like a refs array, try to extract URLs
                    const urlPattern = /https?:\/\/[^\s,\]]+/g;
                    const urls = str.match(urlPattern) || [];
                    if (urls.length > 0 && Array.isArray(fallback)) {
                        return urls as T;
                    }
                }

                // Handle object-like strings that aren't valid JSON
                if (str.includes('{') && str.includes('}')) {
                    return fallback; // Just use fallback for complex objects
                }

                // Handle simple arrays like keywords
                if (str.includes(',') && Array.isArray(fallback)) {
                    try {
                        // Try to split by comma and clean up
                        const items = str.replace(/[\[\]'"`]/g, '').split(',').map(s => s.trim()).filter(Boolean);
                        return items as T;
                    } catch {
                        return fallback;
                    }
                }
            }

            return fallback;
        }
    }

    return {
        id: row.id,
        original_message: row.original_message,
        assistant_answer: row.assistant_answer,
        confidence: row.confidence,
        refs: safeJsonParse(row.refs || '[]', []),
        reason: row.reason,
        rule_id: row.rule_id,
        matched_rule_destinations: safeJsonParse(row.matched_rule_destinations || 'null', null),
        keywords: safeJsonParse(row.keywords || '[]', []),
        trigger_webhooks: row.trigger_webhooks,
        meta: safeJsonParse(row.meta || '{}', {})
    };
}

/**
 * Clears a pending escalation after it has been processed
 */
async function clearPendingEscalation(conversationId: string): Promise<void> {
    await query(
        `DELETE FROM public.pending_escalations WHERE conversation_id = $1`,
        [conversationId]
    );
}

async function ensureConversation(tenantId: string, sessionId: string, siteId?: string | null) {
    const existing = await query<{ id: string }>(
        'select id from public.conversations where tenant_id=$1 and session_id=$2 and site_id=$3 order by created_at desc limit 1',
        [tenantId, sessionId, siteId]
    );
    if (existing.rows[0]?.id) return existing.rows[0].id;

    // Create new conversation
    const ins = await query<{ id: string }>(
        siteId
            ? 'insert into public.conversations (tenant_id, session_id, site_id) values ($1,$2,$3) returning id'
            : 'insert into public.conversations (tenant_id, session_id) values ($1,$2) returning id',
        siteId ? [tenantId, sessionId, siteId] : [tenantId, sessionId]
    );
    const conversationId = ins.rows[0].id;
    // Log conversation_started event
    logEvent({ tenantId, name: 'conversation_started', data: { sessionId, conversationId }, soft: true });

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

const SYSTEM = (voice = 'friendly') => `You are helpNINJA, a concise, helpful site assistant.
Use only the provided Context to answer. If unsure, say you don’t know and offer to connect support.
Voice: ${voice}. Keep answers under 120 words. Include 1 link to the relevant page if useful.

If the user asks about FEATURES or CAPABILITIES, synthesize a short top-3–5 list strictly from Context (page titles help name features). 
If the user asks about PRICING, prefer pricing URLs and include one pricing link if available.
If the user is TROUBLESHOOTING, give up to 2 step bullets from Context; if insufficient, offer to connect support.
`;

export async function POST(req: NextRequest) {
    const headersOut = corsHeaders(req);
    try {
        const allowlist = parseAllowedOrigins();
        const ok = isOriginAllowed(req.headers.get('origin'), allowlist);
        if (!ok) return NextResponse.json({ error: 'origin not allowed' }, { status: 403, headers: headersOut });

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { error: 'server_not_configured', message: 'OpenAI API key is not configured.' },
                { status: 500, headers: headersOut }
            );
        }

        const { tenantId: bodyTid, sessionId, message, voice, siteId } = await req.json();
        console.log("siteId", siteId);
        // Chat API request received (debug log removed)
        const tenantId = await resolveTenantInternalId(bodyTid);
        if (!tenantId)
            return NextResponse.json({ error: 'tenant_not_found', message: 'Unknown tenant identifier.' }, { status: 400, headers: headersOut });
        if (!sessionId || !message)
            return NextResponse.json({ error: 'missing fields' }, { status: 400, headers: headersOut });

        const gate = await canSendMessage(tenantId);
        if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402, headers: headersOut });

        const conversationId = await ensureConversation(tenantId, sessionId, siteId || null);

        // 🔎 Intent classification (before retrieval so we can tune it)
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const { intent, score: intentScore, margin } = await classifyIntent(openai, message);
        const wantFeatures = intent === 'features';
        const wantPricing = intent === 'pricing';
        const wantTrouble = intent === 'troubleshoot';

        // Search for curated answers first, then RAG results (intent-aware k)
        const k = wantFeatures ? 12 : wantPricing ? 8 : 6;
        const { curatedAnswers, ragResults } = await searchWithCuratedAnswers(tenantId, message, k, siteId, { intent });

        // Fetch recent prior messages for lightweight context understanding (last 6 turns, newest first)
        const recent = await query<{ role: string; content: string }>(
            `select role, content from public.messages where conversation_id=$1 and tenant_id=$2 and site_id=$3 order by created_at desc limit 6`,
            [conversationId, tenantId, siteId]
        );
        const recentMessages = recent.rows.reverse(); // oldest first now
        const lastAssistant = [...recentMessages].reverse().find(m => m.role === 'assistant');

        // Detect simple follow-up intents (affirm / decline) responding to an offer to connect support
        const trimmed = (message || '').trim().toLowerCase();
        const isAffirm = /^(y|yes|yeah|yep|sure|please|ok|okay|connect|do it|please do)$/i.test(trimmed);
        const isDecline = /^(n|no|nah|nope|not now|later|maybe later)$/i.test(trimmed);
        const priorOfferedSupport =
            lastAssistant && /connect (you )?with support|connect you to support|handoff/i.test(lastAssistant.content);

        let forcedEscalation = false;
        let forcedHandled = false;
        let text: string | undefined;
        let confidence: number | undefined;
        let refs: string[] = [];
        let userLogged = false; // track if we've already persisted the user message this turn

        if (priorOfferedSupport && (isAffirm || isDecline)) {
            if (isAffirm) {
                // Short‑circuit: user accepted offer → escalate immediately
                text = "Absolutely — I'll loop in a human support member now. You can keep typing while I connect you.";
                confidence = 0.9; // High confidence in intent understanding
                forcedEscalation = true;
            } else if (isDecline) {
                text = "No problem. Feel free to ask another question or tell me what you'd like to do next.";
                confidence = 0.85;
                forcedHandled = true; // We handled without escalation
            }
        }

        // Only run answer generation if we did not short-circuit above
        if (!text) {
            if (curatedAnswers.length > 0) {
                // Use the highest-priority curated answer
                const bestAnswer = curatedAnswers[0];
                text = bestAnswer.answer;
                confidence = 0.95; // High confidence for curated answers
                refs = []; // Curated answers don't have URL refs

                // Log that we used a curated answer
                await query(
                    `insert into public.messages (conversation_id, tenant_id, role, content, confidence, intent, site_id)
           values ($1, $2, 'user', $3, 1.0, $4, $5)`,
                    [conversationId, tenantId, message, intent, siteId]
                );
                userLogged = true;
            } else {
                // 🧱 RAG + OpenAI with lightweight conversation memory
                // Include titles (helps synthesis for features/pricing)
                const contextText = ragResults
                    .map((c: HybridResult, i: number) => `[[${i + 1}]] ${c.title ? `${c.title} – ` : ''}${c.url}\n${c.content}`)
                    .join('\n\n');
                refs = ragResults.map((c: HybridResult) => c.url);

                // Prepare a concise recent history (exclude any system-level constraints; keep only last 3 turns before current)
                const history = recentMessages.slice(-6).filter(m => m.content && m.content.length < 1200); // simple guard
                const historyForModel = history
                    .filter(m => m.role === 'assistant' || m.role === 'user')
                    .map(m => ({ role: m.role as 'assistant' | 'user', content: m.content }));

                // If the user message is very short, provide inline clarification context
                const isShortFollow =
                    !forcedEscalation && trimmed.length <= 5 && /^(y|n|yes|no|ok|okay|sure)$/i.test(trimmed) && lastAssistant;

                // 🎯 Intent-shaped user content
                const userContent = isShortFollow && lastAssistant
                    ? `Follow-up reply: "${message}"
Prior assistant message (for context): ${lastAssistant.content}

Please interpret the follow-up relative to that prior assistant message. If it is an affirmative to connect support, acknowledge and offer escalation; if negative, invite a more specific question.

Context:
${contextText}`
                    : wantFeatures
                        ? `User asked about product features or capabilities.
Return a short ranked list (top 3–5) strictly from Context. Use page titles as hints to name features. Merge duplicates.

Context:
${contextText}`
                        : wantPricing
                            ? `User asked about pricing, plans, trial, or billing.
Give a concise answer strictly from Context and include ONE pricing link if available.

Context:
${contextText}`
                            : wantTrouble
                                ? `User reported a problem or asked how to fix something.
Give up to 2 step-by-step bullets strictly from Context. If insufficient, offer to connect support.

Context:
${contextText}`
                                : `Question: ${message}

Context:
${contextText}`;

                // Memory protection: limit total context size to prevent OOM
                const maxContextLength = 50000; // ~50KB limit
                const finalUserContent = userContent.length > maxContextLength
                    ? userContent.substring(0, maxContextLength) + '\n\n[Context truncated due to length]'
                    : userContent;

                if (userContent.length > maxContextLength) {
                    console.warn('[CHAT] Context truncated for memory protection', {
                        tenantId,
                        originalLength: userContent.length,
                        truncatedLength: finalUserContent.length,
                        ragResultsCount: ragResults.length,
                        historyCount: historyForModel.length
                    });
                }

                // Generate OpenAI response with enhanced error handling
                try {
                    console.log('[CHAT] Generating OpenAI response', {
                        tenantId,
                        sessionId,
                        contextLength: finalUserContent.length,
                        historyLength: historyForModel.length,
                        memoryUsage: process.memoryUsage()
                    });

                    const chat = await openai.chat.completions.create({
                        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: SYSTEM(voice) },
                            // Provide context separately to reduce confusion
                            ...historyForModel,
                            { role: 'user', content: finalUserContent }
                        ] as ChatCompletionMessageParam[],
                        max_tokens: 2000, // Limit response size
                        temperature: 0.7
                    });

                    text = chat.choices[0]?.message?.content?.trim() || "I'm not sure. Want me to connect you with support?";
                    confidence = chat.choices[0]?.finish_reason === 'stop' ? 0.7 : 0.4;

                    console.log('[CHAT] OpenAI response generated successfully', {
                        tenantId,
                        confidence,
                        textLength: text?.length,
                        finishReason: chat.choices[0]?.finish_reason
                    });

                } catch (openaiError) {
                    console.error('[CHAT] OpenAI API error', {
                        tenantId,
                        sessionId,
                        error: openaiError instanceof Error ? openaiError.message : openaiError,
                        errorStack: openaiError instanceof Error ? openaiError.stack : undefined,
                        contextLength: finalUserContent.length,
                        historyLength: historyForModel.length,
                        memoryUsage: process.memoryUsage()
                    });

                    text = "I'm having trouble processing your request right now. Let me connect you with our support team.";
                    confidence = 0.3;
                    forcedEscalation = true;
                }

                // Log user message for RAG path
                await query(
                    `insert into public.messages (conversation_id, tenant_id, role, content, confidence, intent, site_id)
                     values ($1, $2, 'user', $3, 1.0, $4, $5)`,
                    [conversationId, tenantId, message, intent, siteId]
                );
                userLogged = true;
            }
        }

        // Ensure user message stored even for short-circuit intent branches  
        if (!userLogged) {
            try {
                await query(
                    `insert into public.messages (conversation_id, tenant_id, role, content, confidence, intent, site_id)
           values ($1, $2, 'user', $3, 1.0, $4, $5)`,
                    [conversationId, tenantId, message, intent, siteId]
                );
            } catch (e) {
                console.error('⚠️ Failed to log user message (short-circuit)', e);
            }
        }

        const assistantMessage = await query<{ id: string }>(
            `insert into public.messages (conversation_id, tenant_id, role, content, confidence, intent, site_id)
       values ($1, $2, 'assistant', $3, $4, $5, $6) returning id`,
            [conversationId, tenantId, text, confidence, intent, siteId]
        );

        // Trigger message sent webhook for assistant response
        try {
            // Triggering message.sent webhook for assistant message
            await webhookEvents.messageSent(tenantId, conversationId, assistantMessage.rows[0].id, 'assistant', confidence);
            logEvent({ tenantId, name: 'message_sent', data: { conversationId, role: 'assistant', confidence }, soft: true });
            // assistant message.sent webhook triggered successfully
        } catch (error) {
            console.error('💥 Chat API: Failed to trigger message.sent webhook for assistant:', error);
        }

        // Check if we should escalate the conversation
        const threshold = 0.55;

        // 1. Check for standard escalation triggers (low confidence or explicit handoff), or forced acceptance
        const shouldEscalateForConfidence =
            forcedEscalation || ((confidence ?? 0) < threshold || /connect you with support/i.test(text));

        // 2. Check if any escalation rules match regardless of confidence
        let shouldEscalateForRules = false;
        let matchedRuleId: string | null = null;
        let escalationReason = shouldEscalateForConfidence
            ? ((confidence ?? 0) < threshold ? 'low_confidence' : 'handoff')
            : '';

        // 3. Check if user provided contact information in response to our request
        let isContactInfoResponse: ContactInfoResponse;
        try {
            isContactInfoResponse = await checkForContactInfoResponse(message, conversationId);
        } catch (error) {
            console.error('❌ Error checking contact info response:', error);
            isContactInfoResponse = { isContactInfo: false };
        }

        if (isContactInfoResponse.isContactInfo) {
            // Store the contact info and proceed with pending escalation
            await storeContactInfo(conversationId, tenantId, isContactInfoResponse.contactInfo!);

            // Check for pending escalation
            let pendingEscalation: PendingEscalation | null = null;
            try {
                pendingEscalation = await getPendingEscalation(conversationId);
            } catch (error) {
                console.error('❌ Error getting pending escalation, clearing corrupted data:', error);
                await clearPendingEscalation(conversationId);
            }

            if (pendingEscalation) {
                // Proceed with the escalation using stored context
                text = "Thank you for providing your contact information. I'm connecting you with our support team now - they'll reach out to you shortly using your preferred method.";
                confidence = 0.9;

                // Trigger the pending escalation
                setTimeout(async () => {
                    try {
                        await handleEscalation({
                            tenantId,
                            conversationId,
                            sessionId,
                            userMessage: pendingEscalation.original_message,
                            assistantAnswer: pendingEscalation.assistant_answer,
                            confidence: pendingEscalation.confidence,
                            refs: pendingEscalation.refs || [],
                            reason: pendingEscalation.reason,
                            siteId: siteId || null,
                            ruleId: pendingEscalation.rule_id,
                            matchedRuleDestinations: pendingEscalation.matched_rule_destinations,
                            keywords: pendingEscalation.keywords || [],
                            triggerWebhooks: pendingEscalation.trigger_webhooks !== false,
                            meta: {
                                ...pendingEscalation.meta,
                                contactInfo: isContactInfoResponse.contactInfo,
                                fromChat: true
                            }
                        });

                        // Clear the pending escalation
                        await clearPendingEscalation(conversationId);
                    } catch (error) {
                        console.error('❌ Failed to handle pending escalation:', error);
                    }
                }, 100); // Small delay to ensure response is sent first

                // Skip normal escalation flow since we're handling it asynchronously
                await incMessages(tenantId);
                const formattedHtml = renderMarkdownLiteToHtml(text);
                return NextResponse.json(
                    {
                        answer: text,
                        html: formattedHtml,
                        refs: [],
                        confidence,
                        source: 'system',
                        intent
                    },
                    { headers: headersOut }
                );
            } else {
                // No pending escalation found, just acknowledge contact info and continue normally
                text = "Thank you for providing your contact information. How else can I help you today?";
                confidence = 0.9;
            }
        }

        // Extract keywords from the message
        const extractedKeywords = extractKeywords(message);

        try {
            // Evaluate all active rules for this tenant and site (escalation and routing)
            const { rows: rules } = await query(
                `SELECT * FROM public.escalation_rules 
         WHERE tenant_id = $1 AND enabled = true 
         AND (site_id IS NULL OR site_id = $2)
         AND rule_type IN ('escalation', 'routing')
         ORDER BY priority DESC, created_at DESC`,
                [tenantId, siteId || null]
            );

            if (rules.length > 0) {
                // Evaluating escalation/routing rules (debug logs removed)

                // Set up context for rule evaluation
                const context = {
                    message: message,
                    confidence: confidence || 0.7,
                    keywords: extractedKeywords,
                    userEmail: undefined, // No user email in this context
                    timestamp: new Date(),
                    siteId: siteId,
                    sessionDuration: undefined, // Could be tracked in future
                    isOffHours: false, // Could be determined based on tenant timezone
                    conversationLength: undefined // Could be determined from conversation history
                };

                // Check each rule
                interface EscalationRule { id: string; name: string; rule_type: string; conditions?: { operator: string; conditions: unknown[] }; predicate?: { operator: string; conditions: unknown[] }; destinations?: unknown; }
                for (const rule of rules as EscalationRule[]) {
                    // Testing rule (debug log removed)

                    const conditions = (rule.conditions || rule.predicate || { operator: 'and', conditions: [] }) as import('@/lib/rule-engine').RuleConditions;

                    // Skip rules with no conditions
                    if (!conditions.conditions || conditions.conditions.length === 0) {
                        // Skipping rule with no conditions
                        continue;
                    }

                    // Rule structure/operator details removed

                    const result = evaluateRuleConditions(conditions, context);

                    // Rule match evaluation summary removed

                    if (result.matched) {
                        // Handle different rule types
                        if (rule.rule_type === 'escalation') {
                            // Escalation - triggers full handoff to human support
                            shouldEscalateForRules = true;
                            matchedRuleId = rule.id;
                            escalationReason = 'rule_match';
                            // Escalation rule matched
                            break; // Exit after first match for escalation
                        } else if (rule.rule_type === 'routing') {
                            // Routing - route to specific handler with context
                            shouldEscalateForRules = true; // Still use escalation system for routing
                            matchedRuleId = rule.id;
                            escalationReason = 'routing_rule';
                            // Routing rule matched
                            break; // Exit after first match for routing
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error evaluating escalation rules:', error);
        }

        // Process notification rules separately - they don't interrupt the conversation flow
        try {
            const { rows: notificationRules } = await query(
                `SELECT * FROM public.escalation_rules 
         WHERE tenant_id = $1 AND enabled = true 
         AND (site_id IS NULL OR site_id = $2)
         AND rule_type = 'notification'
         ORDER BY priority DESC, created_at DESC`,
                [tenantId, siteId || null]
            );

            if (notificationRules.length > 0) {
                // Evaluating notification rules (debug log removed)

                // Reuse the same context from earlier
                const notificationContext = {
                    message: message,
                    confidence: confidence || 0.7,
                    keywords: extractedKeywords,
                    userEmail: undefined,
                    timestamp: new Date(),
                    siteId: siteId,
                    sessionDuration: undefined,
                    isOffHours: false,
                    conversationLength: undefined
                };

                // Check each notification rule
                interface NotificationRule { id: string; name: string; rule_type: string; conditions?: { operator: string; conditions: unknown[] }; predicate?: { operator: string; conditions: unknown[] }; }
                for (const rule of notificationRules as NotificationRule[]) {
                    const conditions = (rule.conditions || rule.predicate || { operator: 'and', conditions: [] }) as import('@/lib/rule-engine').RuleConditions;

                    if (!conditions.conditions || conditions.conditions.length === 0) {
                        continue;
                    }

                    const result = evaluateRuleConditions(conditions, notificationContext);

                    if (result.matched) {
                        // Notification rule matched

                        // Send notification without interrupting conversation
                        try {
                            // Use our escalation service with a notification flag
                            await handleEscalation({
                                tenantId,
                                conversationId,
                                sessionId,
                                userMessage: message,
                                assistantAnswer: text,
                                confidence,
                                reason: 'user_request', // Use a valid reason
                                ruleId: rule.id,
                                keywords: extractedKeywords,
                                meta: {
                                    isNotification: true, // Special flag for notifications
                                    fromChat: true
                                }
                            });
                        } catch (error) {
                            console.error('❌ Failed to trigger notification:', error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error evaluating notification rules:', error);
        }

        // Combine both escalation conditions
        if ((shouldEscalateForConfidence || shouldEscalateForRules) && !forcedHandled) {
            try {
                // Check if we already have contact info for this conversation
                const existingContactInfo = await getContactInfo(conversationId);

                if (!existingContactInfo) {
                    // We need contact info before escalating - ask the user
                    const contactPrompt = generateContactInfoPrompt();

                    // Store the escalation context so we can proceed after getting contact info
                    let matchedRuleDestinations: EscalationDestination[] | null = null;
                    if (matchedRuleId) {
                        try {
                            const { rows } = await query(
                                `SELECT destinations FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                                [matchedRuleId, tenantId]
                            );
                            if (rows.length > 0 && rows[0].destinations) {
                                matchedRuleDestinations = rows[0].destinations as EscalationDestination[];
                            }
                        } catch (error) {
                            console.error('❌ Error fetching rule destinations:', error);
                        }
                    }

                    const escalationContext = {
                        original_message: message,
                        assistant_answer: text,
                        confidence: confidence ?? 0.7,
                        refs,
                        reason: (forcedEscalation
                            ? 'user_request'
                            : escalationReason === 'low_confidence'
                                ? 'low_confidence'
                                : escalationReason === 'handoff'
                                    ? 'handoff'
                                    : escalationReason === 'rule_match'
                                        ? 'user_request'
                                        : escalationReason === 'routing_rule'
                                            ? 'user_request'
                                            : 'user_request') as EscalationReason,
                        rule_id: matchedRuleId,
                        matched_rule_destinations: matchedRuleDestinations,
                        keywords: extractedKeywords,
                        trigger_webhooks: !(shouldEscalateForRules && Array.isArray(matchedRuleDestinations) && matchedRuleDestinations.some(d => d.type === 'integration')),
                        meta: {
                            fromChat: true,
                            usedCuratedAnswer: curatedAnswers.length > 0,
                            forcedEscalation,
                            intent,
                            intentScore,
                            intentMargin: margin
                        }
                    };

                    await storePendingEscalation(conversationId, escalationContext);

                    // Override the response to ask for contact info
                    text = contactPrompt;
                    confidence = 0.9; // High confidence in our system response
                } else {
                    // We have contact info, proceed with escalation
                    let matchedRuleDestinations: EscalationDestination[] | null = null;
                    if (matchedRuleId) {
                        try {
                            const { rows } = await query(
                                `SELECT destinations FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                                [matchedRuleId, tenantId]
                            );
                            if (rows.length > 0 && rows[0].destinations) {
                                matchedRuleDestinations = rows[0].destinations as EscalationDestination[];
                            }
                        } catch (error) {
                            console.error('❌ Error fetching rule destinations:', error);
                        }
                    }

                    const hasIntegrationDestinations = Array.isArray(matchedRuleDestinations) && matchedRuleDestinations.some(d => d.type === 'integration');
                    const triggerWebhooks = !(shouldEscalateForRules && hasIntegrationDestinations);

                    const result = await handleEscalation({
                        tenantId,
                        conversationId,
                        sessionId,
                        userMessage: message,
                        assistantAnswer: text,
                        confidence,
                        refs,
                        reason: forcedEscalation
                            ? 'user_request'
                            : escalationReason === 'low_confidence'
                                ? 'low_confidence'
                                : escalationReason === 'handoff'
                                    ? 'handoff'
                                    : escalationReason === 'rule_match'
                                        ? 'user_request'
                                        : escalationReason === 'routing_rule'
                                            ? 'user_request'
                                            : 'user_request',
                        siteId: siteId || null,
                        ruleId: matchedRuleId || null,
                        matchedRuleDestinations: matchedRuleDestinations || null,
                        keywords: extractedKeywords,
                        triggerWebhooks,
                        meta: {
                            fromChat: true,
                            usedCuratedAnswer: curatedAnswers.length > 0,
                            forcedEscalation,
                            intent,
                            intentScore,
                            intentMargin: margin,
                            contactInfo: existingContactInfo
                        }
                    });

                    if (!result.ok) {
                        console.error(`❌ Chat API: Escalation failed: ${result.error || 'Unknown error'}`);
                    }
                }
            } catch (error) {
                console.error('❌ Failed to handle escalation:', error);
            }
        }

        await incMessages(tenantId);

        // Ensure text is never undefined
        const finalText = text || "I'm sorry, I encountered an issue. Let me connect you with support.";

        // Server-side lightweight formatting (widget can directly inject this HTML)
        const formattedHtml = renderMarkdownLiteToHtml(finalText);
        return NextResponse.json(
            {
                answer: finalText,
                html: formattedHtml,
                refs,
                confidence: confidence ?? 0.5,
                source: (Array.isArray(curatedAnswers) && curatedAnswers.length > 0) ? 'curated' : 'ai',
                intent // expose for debugging; remove if you don't want it public
            },
            { headers: headersOut }
        );
    } catch (e) {
        // Log the full error for debugging
        console.error('❌ CHAT API ERROR:', e);
        console.error('❌ CHAT API ERROR STACK:', (e as Error).stack);

        // Don't leak internal errors; keep message generic in production
        const dev = process.env.NODE_ENV !== 'production';
        const errorHeaders = headersOut || corsHeaders(req);
        return NextResponse.json(
            { error: 'internal_error', message: dev ? (e as Error).message : 'Unexpected server error.' },
            { status: 500, headers: errorHeaders }
        );
    }
}
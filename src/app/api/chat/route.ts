import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { searchWithCuratedAnswers } from '@/lib/rag';
import { query } from '@/lib/db';
import { canSendMessage, incMessages } from '@/lib/usage';
import { evaluateRuleConditions } from '@/lib/rule-engine';
// Note: Admin/dashboard no longer use header-based tenant resolution. The widget passes a public identifier in body.
import { webhookEvents } from '@/lib/webhooks';
import { extractKeywords } from '@/lib/extract-keywords';
import { handleEscalation } from '@/lib/escalation-service';

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

// const SYSTEM = (voice = 'friendly') => `You are helpNINJA, a concise, helpful site assistant.
// Use only the provided Context to answer. If unsure, say you don’t know and offer to connect support.
// Voice: ${voice}. Keep answers under 120 words. Include 1 link to the relevant page if useful.`;

const SYSTEM = (voice = 'friendly') => `
You are helpNINJA, a concise, helpful website marketing assistant and first level support engineer.  You are an expert at answering questions about the website and its products or services, using only the provided Context. If you are unsure of the answer, say you don’t know and offer to connect the user with human support.

Rules:
- Use only the provided Context. If the answer isn’t in Context, politely respond that you don't have the answer to that and offer to connect support.
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

        const { tenantId: bodyTid, sessionId, message, voice, siteId } = await req.json();
        console.log(`💬 Chat API: Received message for session ${sessionId}, tenant identifier: ${bodyTid}, ${siteId}`);
        const tenantId = await resolveTenantInternalId(bodyTid);
        if (!tenantId) return NextResponse.json({ error: 'tenant_not_found', message: 'Unknown tenant identifier.' }, { status: 400, headers: headersOut });
        if (!sessionId || !message) return NextResponse.json({ error: 'missing fields' }, { status: 400, headers: headersOut });

        const gate = await canSendMessage(tenantId);
        if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 402, headers: headersOut });

        const conversationId = await ensureConversation(tenantId, sessionId);

        // Search for curated answers first, then RAG results (we may skip if we short‑circuit on follow-up intent)
        const { curatedAnswers, ragResults } = await searchWithCuratedAnswers(tenantId, message, 6, siteId);

        // Fetch recent prior messages for lightweight context understanding (last 6 turns, newest first)
        const recent = await query<{ role: string; content: string }>(
            `select role, content from public.messages where conversation_id=$1 and tenant_id=$2 order by created_at desc limit 6`,
            [conversationId, tenantId]
        );
        const recentMessages = recent.rows.reverse(); // oldest first now
        const lastAssistant = [...recentMessages].reverse().find(m => m.role === 'assistant');

        // Detect simple follow-up intents (affirm / decline) responding to an offer to connect support
        const trimmed = (message || '').trim().toLowerCase();
        const isAffirm = /^(y|yes|yeah|yep|sure|please|ok|okay|connect|do it|please do)$/i.test(trimmed);
        const isDecline = /^(n|no|nah|nope|not now|later|maybe later)$/i.test(trimmed);
        const priorOfferedSupport = lastAssistant && /connect (you )?with support|connect you to support|handoff/i.test(lastAssistant.content);

        let forcedEscalation = false;
        let forcedHandled = false;
        let text: string | undefined;
        let confidence: number | undefined;
        let refs: string[] = [];
        let userLogged = false; // track if we've already persisted the user message this turn

        if (priorOfferedSupport && (isAffirm || isDecline)) {
            if (isAffirm) {
                // Short‑circuit: user accepted offer → escalate immediately
                text = 'Absolutely — I\'ll loop in a human support member now. You can keep typing while I connect you.';
                confidence = 0.9; // High confidence in intent understanding
                forcedEscalation = true;
            } else if (isDecline) {
                text = 'No problem. Feel free to ask another question or tell me what you\'d like to do next.';
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
                await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                         values ($1, $2, 'user', $3, 1.0)`,
                    [conversationId, tenantId, message]);
                userLogged = true;
            } else {
                // Fall back to RAG + OpenAI with lightweight conversation memory
                const contextText = ragResults.map((c, i) => `[[${i + 1}]] ${c.url}\n${c.content}`).join('\n\n');
                refs = ragResults.map(c => c.url);

                // Prepare a concise recent history (exclude any system-level constraints; keep only last 3 turns before current)
                const history = recentMessages.slice(-6).filter(m => m.content && m.content.length < 1200); // simple guard
                const historyForModel = history
                    .filter(m => m.role === 'assistant' || m.role === 'user')
                    .map(m => ({ role: m.role as 'assistant' | 'user', content: m.content }));

                // If the user message is very short, provide inline clarification context
                const isShortFollow = !forcedEscalation && trimmed.length <= 5 && /^(y|n|yes|no|ok|okay|sure)$/i.test(trimmed) && lastAssistant;
                const userContent = isShortFollow && lastAssistant
                    ? `Follow-up reply: "${message}"\nPrior assistant message (for context): ${lastAssistant.content}\n\nPlease interpret the follow-up relative to that prior assistant message. If it is an affirmative to connect support, acknowledge and offer escalation; if negative, invite a more specific question.\nUser original input (current turn): ${message}\n\nContext:\n${contextText}`
                    : `Question: ${message}\n\nContext:\n${contextText}`;

                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const chat = await openai.chat.completions.create({
                    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM(voice) },
                        // Provide context separately to reduce confusion
                        ...historyForModel,
                        { role: 'user', content: userContent }
                    ] as ChatCompletionMessageParam[]
                });

                text = chat.choices[0]?.message?.content?.trim() || "I'm not sure. Want me to connect you with support?";
                confidence = chat.choices[0]?.finish_reason === 'stop' ? 0.7 : 0.4;

                // Log user message
                const userMessage = await query<{ id: string }>(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                         values ($1, $2, 'user', $3, 1.0) returning id`,
                    [conversationId, tenantId, message]);
                userLogged = true;

                // Trigger message sent webhook for user message
                try {
                    console.log(`🔔 Chat API: Triggering message.sent webhook for user message ${userMessage.rows[0].id}`);
                    await webhookEvents.messageSent(tenantId, conversationId, userMessage.rows[0].id, 'user');
                    console.log(`✅ Chat API: message.sent webhook triggered successfully`);
                } catch (error) {
                    console.error('💥 Chat API: Failed to trigger message.sent webhook for user:', error);
                }
            }
        }

        // Ensure user message stored even for short-circuit intent branches
        if (!userLogged) {
            try {
                await query(`insert into public.messages (conversation_id, tenant_id, role, content, confidence)
                             values ($1, $2, 'user', $3, 1.0)`, [conversationId, tenantId, message]);
            } catch (e) {
                console.error('⚠️ Failed to log user message (short-circuit)', e);
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

        // Check if we should escalate the conversation
        const threshold = 0.55;

        // 1. Check for standard escalation triggers (low confidence or explicit handoff), or forced acceptance
        const shouldEscalateForConfidence = forcedEscalation || ((confidence ?? 0) < threshold || /connect you with support/i.test(text));

        // 2. Check if any escalation rules match regardless of confidence
        let shouldEscalateForRules = false;
        let matchedRuleId = null;
        let escalationReason = shouldEscalateForConfidence
            ? ((confidence ?? 0) < threshold ? 'low_confidence' : 'handoff')
            : '';

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
                console.log(`🔍 Chat API: Evaluating ${rules.length} escalation/routing rules`);
                console.log(`🔍 Chat API: Extracted keywords: ${JSON.stringify(extractedKeywords)}`);

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
                for (const rule of rules) {
                    console.log(`📝 Testing rule: "${rule.name}" (ID: ${rule.id})`);

                    const conditions = rule.conditions || rule.predicate || { operator: 'and', conditions: [] };

                    // Skip rules with no conditions
                    if (!conditions.conditions || conditions.conditions.length === 0) {
                        console.log(`⚠️ Skipping rule with no conditions: ${rule.name}`);
                        continue;
                    }

                    console.log(`🔍 Rule structure: ${JSON.stringify(conditions)}`);
                    console.log(`⚙️ Rule operator: ${conditions.operator}`);

                    const result = evaluateRuleConditions(conditions, context);

                    console.log(`${result.matched ? '✅' : '❌'} Rule "${rule.name}" ${result.matched ? 'MATCHED' : 'DID NOT MATCH'}`);
                    console.log(`📊 Evaluation details: ${JSON.stringify(result.details)}`);

                    if (result.matched) {
                        // Handle different rule types
                        if (rule.rule_type === 'escalation') {
                            // Escalation - triggers full handoff to human support
                            shouldEscalateForRules = true;
                            matchedRuleId = rule.id;
                            escalationReason = 'rule_match';
                            console.log(`🚨 RULE MATCH: "${rule.name}" matched for message. Escalating via rule destinations.`);
                            break; // Exit after first match for escalation
                        }
                        else if (rule.rule_type === 'routing') {
                            // Routing - route to specific handler with context
                            shouldEscalateForRules = true; // Still use escalation system for routing
                            matchedRuleId = rule.id;
                            escalationReason = 'routing_rule';
                            console.log(`🔀 ROUTING RULE: "${rule.name}" matched for message. Routing to specific handler.`);
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
                console.log(`🔔 Chat API: Evaluating ${notificationRules.length} notification rules`);

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
                for (const rule of notificationRules) {
                    const conditions = rule.conditions || rule.predicate || { operator: 'and', conditions: [] };

                    if (!conditions.conditions || conditions.conditions.length === 0) {
                        continue;
                    }

                    const result = evaluateRuleConditions(conditions, notificationContext);

                    if (result.matched) {
                        console.log(`📢 NOTIFICATION RULE: "${rule.name}" matched for message.`);

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
                // Store the rule destinations if a rule matched
                let matchedRuleDestinations = null;
                if (matchedRuleId) {
                    try {
                        // Fetch the rule to get its destinations
                        const { rows } = await query(
                            `SELECT destinations FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                            [matchedRuleId, tenantId]
                        );

                        if (rows.length > 0 && rows[0].destinations) {
                            matchedRuleDestinations = rows[0].destinations;
                            console.log(`📨 Found ${matchedRuleDestinations.length} destinations for matched rule`);
                        }
                    } catch (error) {
                        console.error('❌ Error fetching rule destinations:', error);
                    }
                }

                // SOLUTION FOR DUPLICATE EMAILS: Choose whether to trigger webhooks based on destination types
                // Define the destination type locally to avoid TypeScript errors
                interface Destination {
                    type: string;
                    integration_id?: string;
                    email?: string;
                }

                const hasIntegrationDestinations = matchedRuleDestinations &&
                    Array.isArray(matchedRuleDestinations) &&
                    matchedRuleDestinations.some((d: Destination) => d.type === 'integration');

                // Use our centralized escalation service
                console.log(`🔀 Using escalation service for ${shouldEscalateForConfidence ? 'confidence-based' : 'rule-based'} escalation`);

                // Determine if we should trigger webhooks
                const triggerWebhooks = !(shouldEscalateForRules && hasIntegrationDestinations);
                if (!triggerWebhooks) {
                    console.log('� Skipping webhooks for rule-based escalation with integration destinations');
                }

                // Call escalation service directly
                const result = await handleEscalation({
                    tenantId,
                    conversationId,
                    sessionId,
                    userMessage: message,
                    assistantAnswer: text,
                    confidence,
                    refs,
                    reason: forcedEscalation ? 'user_request' : (
                        escalationReason === 'low_confidence' ? 'low_confidence' :
                            escalationReason === 'handoff' ? 'handoff' :
                                escalationReason === 'rule_match' ? 'user_request' :
                                    escalationReason === 'routing_rule' ? 'user_request' : 'user_request'
                    ),
                    siteId: siteId || null,
                    ruleId: matchedRuleId,
                    matchedRuleDestinations,
                    keywords: extractedKeywords,
                    triggerWebhooks,
                    meta: {
                        fromChat: true,
                        usedCuratedAnswer: curatedAnswers.length > 0,
                        forcedEscalation
                    }
                });

                if (result.ok) {
                    console.log(`✅ Chat API: Escalation handled successfully`);
                } else {
                    console.error(`❌ Chat API: Escalation failed: ${result.error || 'Unknown error'}`);
                }

                console.log(`🚨 Chat API: Escalation triggered - reason: ${escalationReason}${matchedRuleId ? `, rule: ${matchedRuleId}` : ''}`);
            } catch (error) {
                console.error('❌ Failed to handle escalation:', error);
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
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchWithCuratedAnswers } from '@/lib/rag';
import { query } from '@/lib/db';
import { canSendMessage, incMessages } from '@/lib/usage';
// Note: Admin/dashboard no longer use header-based tenant resolution. The widget passes a public identifier in body.
import { webhookEvents } from '@/lib/webhooks';
import { evaluateRuleConditions } from '@/lib/rule-engine';
import { dispatchEscalation } from '@/lib/integrations/dispatch';
import { v4 as uuidv4 } from 'uuid';

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

        // For now, we'll use undefined for site_id
        // This could be enhanced to extract from widget context or session
        const siteId = undefined; // We'll ignore site_id filtering for now to ensure rules match

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

        // Check escalation rules for the user message
        console.log(`🔍 RULE DEBUG [1]: Starting rule evaluation for message: "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`)
        console.log(`🔍 RULE DEBUG [2]: Message content to check against keywords: "${message}"`)
        console.log(`🔍 RULE DEBUG [3]: TenantId: ${tenantId}, ConversationId: ${conversationId}`)

        // Get active rules for this tenant - Modified to find all applicable rules
        console.log(`🔍 RULE DEBUG [4]: Querying DB for active rules with SQL:
            SELECT * FROM public.escalation_rules 
            WHERE tenant_id = '${tenantId}' 
            AND enabled = true 
            AND rule_type = 'escalation'
            ORDER BY priority DESC`)
            
        const { rows: rules } = await query(
            `SELECT * FROM public.escalation_rules 
             WHERE tenant_id = $1 
             AND enabled = true 
             ORDER BY priority DESC`,
            [tenantId]
        );
        console.log(`🔍 RULE DEBUG [5]: Query result: Found ${rules.length} active rules`)
        if (rules.length > 0) {
            console.log(`🔍 RULE DEBUG [6]: First rule details: id=${rules[0].id}, name=${rules[0].name}, conditions=${JSON.stringify(rules[0].conditions)}`)
        }

        console.log(`📋 Found ${rules.length} active escalation rules to check`)

        let ruleTriggered = false;

        if (rules.length > 0) {
            // Prepare evaluation context with message content
            const context: {
                message: string;
                confidence: number;
                keywords: string[];
                timestamp: Date;
                siteId?: string;
            } = {
                message: message,
                confidence: confidence || 0.7,
                keywords: [], // Extract keywords if available
                timestamp: new Date(),
                siteId: siteId
            }

            // Check each rule
            for (const rule of rules) {
                console.log(`🔍 RULE DEBUG [7]: Starting evaluation for rule: ${rule.name} (${rule.id})`)

                // Get the conditions from the rule
                const conditions = rule.conditions || { operator: 'and', conditions: [] }
                console.log(`🔍 RULE DEBUG [8]: Rule conditions structure: ${JSON.stringify(conditions)}`)

                // Prepare context object used for evaluation
                console.log(`🔍 RULE DEBUG [9]: Evaluation context: ${JSON.stringify(context)}`)

                // Evaluate rule against context
                console.log(`🔍 RULE DEBUG [10]: Calling evaluateRuleConditions()`)
                const result = evaluateRuleConditions(conditions, context)
                console.log(`🔍 RULE DEBUG [11]: Rule evaluation result: matched=${result.matched}, details=${JSON.stringify(result.details)}`)

                if (result.matched) {
                    console.log(`✅ RULE DEBUG [12]: Rule matched: ${rule.name}`)

                    // Update last evaluated timestamp
                    console.log(`✅ RULE DEBUG [13]: Updating rule match statistics in DB`)
                    await query(
                        `UPDATE public.escalation_rules SET last_evaluated_at = NOW(), 
                         last_matched_at = NOW(), match_count = match_count + 1 
                         WHERE id = $1`,
                        [rule.id]
                    )
                    console.log(`✅ RULE DEBUG [14]: Rule statistics updated successfully`)

                    // Prepare escalation event
                    const event = {
                        tenantId,
                        sessionId,
                        conversationId,
                        userMessage: message,
                        assistantAnswer: text,
                        confidence: confidence || 0.7,
                        reason: 'rule_match',
                        refs,
                        ruleId: rule.id
                    }

                    console.log(`🚀 RULE DEBUG [15]: Rule match - dispatching escalation for rule: ${rule.name}`)

                    // Dispatch the escalation with rule destinations
                    const destinations = rule.destinations || [];
                    console.log(`🚀 RULE DEBUG [16]: Rule destinations: ${JSON.stringify(destinations)}`)

                    // Create escalation payload with proper typing
                    interface EscalationPayload {
                        tenantId: string;
                        sessionId: string;
                        conversationId: string;
                        userMessage: string;
                        assistantAnswer: string;
                        confidence: number;
                        reason: string;
                        refs: string[];
                        ruleId: string;
                        destinations?: Array<{ integrationId: string }>;
                    }

                    const eventBody: EscalationPayload = { ...event };
                    console.log(`🚀 RULE DEBUG [17]: Initial event payload: ${JSON.stringify(eventBody)}`)

                    if (destinations && destinations.length > 0) {
                        // Convert rule destinations to the format expected by dispatchEscalation
                        interface Destination {
                            integration_id?: string;
                            type?: string;
                        }

                        console.log(`🚀 RULE DEBUG [18]: Processing destinations for rule`)
                        const integrationIds = destinations
                            .filter((d: Destination) => d.integration_id)
                            .map((d: Destination) => ({ integrationId: d.integration_id as string }));

                        console.log(`🚀 RULE DEBUG [19]: Converted destinations: ${JSON.stringify(integrationIds)}`)

                        if (integrationIds.length > 0) {
                            eventBody.destinations = integrationIds;
                            console.log(`🚀 RULE DEBUG [20]: Updated event payload with destinations: ${JSON.stringify(eventBody)}`)
                        } else {
                            console.log(`🚀 RULE DEBUG [21]: No valid integration IDs found in rule destinations`)
                        }
                    } else {
                        console.log(`🚀 RULE DEBUG [22]: No destinations in rule, will use default escalation channels`)
                    }

                    // Use the escalate API for consistency with existing implementation
                    const base = process.env.SITE_URL || '';
                    const url = base ? base.replace(/\/$/, '') + '/api/escalate' : 'http://localhost:3001/api/escalate';
                    console.log(`🚀 RULE DEBUG [23]: Escalation API URL: ${url}`)

                    try {
                        console.log(`🚀 RULE DEBUG [24]: Sending POST request to escalation API`)
                        const payloadJson = JSON.stringify(eventBody);
                        console.log(`🚀 RULE DEBUG [25]: Request payload: ${payloadJson}`)

                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            body: payloadJson
                        });

                        const responseStatus = response.status;
                        const responseText = await response.text();
                        console.log(`🚀 RULE DEBUG [26]: API response status: ${responseStatus}`);
                        console.log(`🚀 RULE DEBUG [27]: API response body: ${responseText}`);

                        if (response.ok) {
                            console.log(`✅ RULE DEBUG [28]: Rule-based escalation sent successfully for rule: ${rule.name}`);
                            ruleTriggered = true;
                        } else {
                            console.error(`❌ RULE DEBUG [29]: Failed to send rule-based escalation: Status ${responseStatus}, Body: ${responseText}`);
                        }
                    } catch (error) {
                        console.error(`❌ RULE DEBUG [30]: Exception during API call: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        console.error('❌ Error sending rule-based escalation:', error);
                    }

                    break; // Stop after first matching rule
                } else {
                    console.log(`❌ RULE DEBUG [31]: Rule did not match: ${rule.name}`);

                    // Log why the rule didn't match
                    if (result.details && result.details.length > 0) {
                        result.details.forEach((detail, i) => {
                            console.log(`❌ RULE DEBUG [32.${i}]: Condition result: matched=${detail.result}, reason=${detail.reason}`);
                        });
                    }

                    // Update evaluation timestamp
                    console.log(`❌ RULE DEBUG [33]: Updating last_evaluated_at timestamp for non-matching rule`);
                    await query(
                        `UPDATE public.escalation_rules SET last_evaluated_at = NOW() WHERE id = $1`,
                        [rule.id]
                    );
                    console.log(`❌ RULE DEBUG [34]: Timestamp updated for rule ${rule.id}`);
                }
            }
        }

        // Auto-escalate on low confidence or explicit handoff only if a rule didn't already trigger
        const threshold = 0.55;
        if (!ruleTriggered && ((confidence ?? 0) < threshold || /connect you with support/i.test(text))) {
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

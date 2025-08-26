import { NextRequest, NextResponse } from 'next/server'
import { handleEscalation } from '@/lib/escalation-service'
import { getTenantIdStrict } from '@/lib/tenant-resolve'
import { withCORS } from '@/lib/cors'
import { query } from '@/lib/db'
import { evaluateRuleConditions } from '@/lib/rule-engine'

export const runtime = 'nodejs'

export async function OPTIONS() {
    return withCORS(new Response(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
    try {
        if (req.method !== 'POST') {
            return withCORS(NextResponse.json({ error: 'method not allowed' }, { status: 405 }));
        }

        // Parse request JSON
        const payload = JSON.parse(await req.text());

        // Note: origin flags (fromWebhook, integrationId, fromChat, skipWebhooks) are kept in payload for handleEscalation meta usage.

        // ensure tenantId present via strict server resolution
        if (!payload?.tenantId) {
            try {
                payload.tenantId = await getTenantIdStrict();
            } catch (error) {
                console.error(`🚨 ESCALATE DEBUG [7]: Failed to resolve tenantId: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        if (!payload?.tenantId || !payload?.conversationId || !payload?.userMessage) {
            console.error(`🚨 ESCALATE DEBUG [8]: Missing required fields: tenantId=${!!payload?.tenantId}, conversationId=${!!payload?.conversationId}, userMessage=${!!payload?.userMessage}`);
            return withCORS(NextResponse.json({ error: 'missing fields' }, { status: 400 }))
        }

        // Check if a rule was already matched in the chat route
        let matchedRuleDestinations = null;
        let ruleId = payload.matchedRuleId || payload.ruleId || null;

        if (ruleId) {
            // Get the rule details if needed
            const { rows } = await query(
                `SELECT * FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                [ruleId, payload.tenantId]
            );

            if (rows.length > 0) {
                const matchedRule = rows[0];

                // Use destinations from the rule
                if (matchedRule.destinations && matchedRule.destinations.length > 0) {
                    matchedRuleDestinations = matchedRule.destinations;
                }
            }
        }

        // If no pre-matched rule, check active rules for this tenant and evaluate them
        if (!ruleId) {
            const { rows: rules } = await query(
                `SELECT * FROM public.escalation_rules 
                 WHERE tenant_id = $1 AND enabled = true 
                 AND (site_id IS NULL OR site_id = $2)
                 ORDER BY priority DESC, created_at DESC`,
                [payload.tenantId, payload.siteId || null]
            );

            if (rules.length > 0) {
                // Prepare evaluation context
                const context = {
                    message: payload.userMessage || '',
                    confidence: payload.confidence || 0.7,
                    keywords: payload.keywords || [],
                    userEmail: payload.userEmail,
                    timestamp: new Date(),
                    siteId: payload.siteId,
                    sessionDuration: payload.sessionDuration,
                    isOffHours: payload.isOffHours,
                    conversationLength: payload.conversationLength,
                    customFields: payload.customFields
                };

                // Check each rule
                for (const rule of rules) {
                    // Use the conditions field
                    const conditions = rule.conditions || { operator: 'and', conditions: [] };

                    // Evaluate rule against context
                    const result = evaluateRuleConditions(conditions, context);

                    if (result.matched) {
                        ruleId = rule.id;
                        matchedRuleDestinations = rule.destinations || [];
                        break;
                    }
                }
            }
        }

        const result = await handleEscalation({
            tenantId: payload.tenantId,
            conversationId: payload.conversationId,
            sessionId: payload.sessionId,
            userMessage: payload.userMessage,
            assistantAnswer: payload.assistantAnswer,
            confidence: payload.confidence,
            refs: payload.refs || [],
            reason: payload.reason || 'manual',
            siteId: payload.siteId,
            ruleId: ruleId,
            matchedRuleDestinations: matchedRuleDestinations,
            keywords: payload.keywords || [],
            triggerWebhooks: !payload.skipWebhooks,
            integrationId: payload.integrationId,
            meta: {
                fromWebhook: payload.fromWebhook,
                fromChat: payload.fromChat,
                userEmail: payload.userEmail,
                sessionDuration: payload.sessionDuration,
                isOffHours: payload.isOffHours,
                conversationLength: payload.conversationLength,
                customFields: payload.customFields || {}
            }
        });

        if (!result.ok) {
            console.error(`❌ ESCALATE DEBUG [15]: Failed to handle escalation: ${result.error || 'Unknown error'}`);
        }

        return withCORS(NextResponse.json(result, { status: result.ok ? 200 : 500 }));
    } catch (error) {
        console.error('❌ Error in escalate API:', error);
        return withCORS(NextResponse.json({
            ok: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 }));
    }
}

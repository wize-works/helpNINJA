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
        console.log(`🚨 ESCALATE DEBUG [1]: Escalation API called`);

        if (req.method !== 'POST') {
            console.log(`🚨 ESCALATE DEBUG [2]: Invalid method: ${req.method}`);
            return withCORS(NextResponse.json({ error: 'method not allowed' }, { status: 405 }));
        }

        // Log raw request body for debugging
        const rawBody = await req.text();
        console.log(`🚨 ESCALATE DEBUG [3]: Raw request body: ${rawBody}`);

        // Parse the JSON
        const payload = JSON.parse(rawBody);

        // Check for webhook loop prevention flags
        const isWebhookOrigin = !!payload.fromWebhook;
        const hasIntegrationId = !!payload.integrationId;
        const isFromChat = !!payload.fromChat;
        const shouldSkipWebhooks = !!payload.skipWebhooks;

        console.log(`🚨 ESCALATE DEBUG [4]: Parsed request payload: ${JSON.stringify(payload)}`);
        console.log(`🚨 ESCALATE DEBUG [4.1]: Request origin flags - fromWebhook: ${isWebhookOrigin}, integrationId: ${hasIntegrationId}, fromChat: ${isFromChat}, skipWebhooks: ${shouldSkipWebhooks}`);

        // ensure tenantId present via strict server resolution
        if (!payload?.tenantId) {
            console.log(`🚨 ESCALATE DEBUG [5]: Missing tenantId, attempting strict resolution`);
            try {
                payload.tenantId = await getTenantIdStrict();
                console.log(`🚨 ESCALATE DEBUG [6]: Resolved tenantId: ${payload.tenantId}`);
            } catch (error) {
                console.error(`🚨 ESCALATE DEBUG [7]: Failed to resolve tenantId: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        if (!payload?.tenantId || !payload?.conversationId || !payload?.userMessage) {
            console.error(`🚨 ESCALATE DEBUG [8]: Missing required fields: tenantId=${!!payload?.tenantId}, conversationId=${!!payload?.conversationId}, userMessage=${!!payload?.userMessage}`);
            return withCORS(NextResponse.json({ error: 'missing fields' }, { status: 400 }))
        }

        console.log(`🚨 ESCALATE DEBUG [9]: Escalation triggered for tenant ${payload.tenantId}, conversation ${payload.conversationId}`);

        // Check if a rule was already matched in the chat route
        let matchedRuleDestinations = null;
        let ruleId = payload.matchedRuleId || payload.ruleId || null;

        if (ruleId) {
            console.log(`🔍 Using rule ID: ${ruleId}`);

            // Get the rule details if needed
            const { rows } = await query(
                `SELECT * FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                [ruleId, payload.tenantId]
            );

            if (rows.length > 0) {
                const matchedRule = rows[0];
                console.log(`✅ Found rule: "${matchedRule.name}"`);

                // Use destinations from the rule
                if (matchedRule.destinations && matchedRule.destinations.length > 0) {
                    console.log(`📤 Using destinations from rule: ${matchedRule.name}`);
                    matchedRuleDestinations = matchedRule.destinations;

                    // Log detailed information about destinations for debugging
                    console.log(`🔎 DEBUG: Destination details: ${JSON.stringify(matchedRuleDestinations)}`);
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

            console.log(`📋 Found ${rules.length} active escalation rules for tenant ${payload.tenantId}`);

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
                        console.log(`✅ Rule matched: ${rule.name} (${rule.id})`);
                        ruleId = rule.id;
                        matchedRuleDestinations = rule.destinations || [];
                        break;
                    }
                }

                if (!ruleId) {
                    console.log('⚠️ No matching rule found, will use default integrations');
                }
            }
        }

        // Use our centralized escalation service
        console.log(`🚀 Calling handleEscalation service`);

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

        console.log(`🚨 ESCALATE DEBUG [13]: Escalation service result: ${JSON.stringify(result)}`);

        if (result.ok) {
            console.log('✅ ESCALATE DEBUG [14]: Escalation handled successfully');
        } else {
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

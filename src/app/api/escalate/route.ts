import { NextRequest, NextResponse } from 'next/server'
import { dispatchEscalation } from '@/lib/integrations/dispatch'
import { getTenantIdStrict } from '@/lib/tenant-resolve'
import { withCORS } from '@/lib/cors'
import { query } from '@/lib/db'
import { evaluateRuleConditions } from '@/lib/rule-engine'
import { webhookEvents } from '@/lib/webhooks'

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
        const ev = JSON.parse(rawBody);
        console.log(`🚨 ESCALATE DEBUG [4]: Parsed request payload: ${JSON.stringify(ev)}`);

        // ensure tenantId present via strict server resolution
        if (!ev?.tenantId) {
            console.log(`🚨 ESCALATE DEBUG [5]: Missing tenantId, attempting strict resolution`);
            try {
                ev.tenantId = await getTenantIdStrict();
                console.log(`🚨 ESCALATE DEBUG [6]: Resolved tenantId: ${ev.tenantId}`);
            } catch (error) {
                console.error(`🚨 ESCALATE DEBUG [7]: Failed to resolve tenantId: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        if (!ev?.tenantId || !ev?.conversationId || !ev?.userMessage) {
            console.error(`🚨 ESCALATE DEBUG [8]: Missing required fields: tenantId=${!!ev?.tenantId}, conversationId=${!!ev?.conversationId}, userMessage=${!!ev?.userMessage}`);
            return withCORS(NextResponse.json({ error: 'missing fields' }, { status: 400 }))
        }

        console.log(`🚨 ESCALATE DEBUG [9]: Escalation triggered for tenant ${ev.tenantId}, conversation ${ev.conversationId}`);
        console.log(`🚨 ESCALATE DEBUG [10]: Reason: ${ev.reason}, Confidence: ${ev.confidence}`);

        // First trigger the webhook event if it wasn't already triggered
        try {
            await webhookEvents.escalationTriggered(
                ev.tenantId,
                ev.conversationId,
                ev.reason || 'manual',
                ev.confidence
            );
            console.log('✅ Escalation webhook triggered successfully');
        } catch (error) {
            console.error('❌ Failed to trigger escalation webhook:', error);
        }

        // Get active rules for this tenant to determine destinations
        const { rows: rules } = await query(
            `SELECT * FROM public.escalation_rules 
             WHERE tenant_id = $1 AND enabled = true 
             AND (site_id IS NULL OR site_id = $2)
             ORDER BY priority DESC, created_at DESC`,
            [ev.tenantId, ev.siteId || null]
        );

        console.log(`📋 Found ${rules.length} active escalation rules for tenant ${ev.tenantId}`);

        if (rules.length > 0) {
            // Prepare evaluation context
            const context = {
                message: ev.userMessage,
                confidence: ev.confidence || 0.7,
                keywords: ev.keywords || [],
                userEmail: ev.userEmail,
                timestamp: new Date(),
                siteId: ev.siteId,
                sessionDuration: ev.sessionDuration,
                isOffHours: ev.isOffHours,
                conversationLength: ev.conversationLength,
                customFields: ev.customFields
            };

            let matchedRule = null;

            // Check each rule
            for (const rule of rules) {
                // Use the conditions field
                const conditions = rule.conditions || { operator: 'and', conditions: [] };

                // Evaluate rule against context
                const result = evaluateRuleConditions(conditions, context);

                if (result.matched) {
                    console.log(`✅ Rule matched: ${rule.name} (${rule.id})`);
                    matchedRule = rule;
                    break;
                }
            }

            if (matchedRule) {
                // Add rule's destinations to the event
                const destinations = matchedRule.destinations || [];

                if (destinations.length > 0) {
                    console.log(`📤 Using destinations from matched rule: ${matchedRule.name}`);

                    // Convert rule destinations to the format expected by dispatchEscalation
                    type Destination = { type: string; integration_id?: string; email?: string };
                    const typedDestinations = destinations as Destination[];

                    ev.destinations = typedDestinations
                        .filter(d => (d.type === 'email' || d.type === 'slack') && d.integration_id)
                        .map(d => ({ integrationId: d.integration_id }));

                    console.log(`📨 Dispatching to ${ev.destinations.length} destinations`);
                }
            } else {
                console.log('⚠️ No matching rule found, will use default integrations');
            }
        }

        // Even if no rule matched, still dispatch the escalation
        // If no destinations are specified, dispatchEscalation will use environment fallbacks
        console.log(`🚨 ESCALATE DEBUG [11]: Calling dispatchEscalation with payload: ${JSON.stringify(ev)}`);
        console.log(`🚨 ESCALATE DEBUG [12]: Payload has destinations: ${!!ev.destinations}, count: ${ev.destinations ? ev.destinations.length : 0}`);

        const r = await dispatchEscalation(ev)
        console.log(`🚨 ESCALATE DEBUG [13]: dispatchEscalation result: ${JSON.stringify(r)}`);

        if (r.ok) {
            console.log('✅ ESCALATE DEBUG [14]: Escalation dispatched successfully');
        } else {
            console.error(`❌ ESCALATE DEBUG [15]: Failed to dispatch escalation: ${r.error || 'Unknown error'}`);
        }

        // Prepare a response that only includes properties we know exist
        const response = {
            ok: r.ok,
            results: 'results' in r ? r.results : []
        };

        return withCORS(NextResponse.json(response, { status: r.ok ? 200 : 500 }));
    } catch (error) {
        console.error('❌ Error in escalate API:', error);
        return withCORS(NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 }));
    }
}

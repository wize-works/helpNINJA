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
        if (req.method !== 'POST') return withCORS(NextResponse.json({ error: 'method not allowed' }, { status: 405 }))
        const ev = await req.json()

        // ensure tenantId present via strict server resolution
        if (!ev?.tenantId) {
            try { ev.tenantId = await getTenantIdStrict() } catch { }
        }

        if (!ev?.tenantId || !ev?.conversationId || !ev?.userMessage) {
            return withCORS(NextResponse.json({ error: 'missing fields' }, { status: 400 }))
        }

        console.log(`🚨 Escalation triggered for tenant ${ev.tenantId}, conversation ${ev.conversationId}`);
        console.log(`Reason: ${ev.reason}, Confidence: ${ev.confidence}`);

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
        const r = await dispatchEscalation(ev)

        if (r.ok) {
            console.log('✅ Escalation dispatched successfully');
        } else {
            console.error('❌ Failed to dispatch escalation:', r.error || 'Unknown error');
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

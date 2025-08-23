import { dispatchEscalation } from './integrations/dispatch';
import { EscalationEvent, EscalationReason } from './integrations/types';
import { query } from './db';
import { webhookEvents } from './webhooks';
import crypto from 'crypto';

// Define types for the escalation service
export interface EscalationDestination {
    type?: string;
    integration_id?: string;
    integrationId?: string;
    email?: string;
    [key: string]: unknown; // For other properties we might not know about
}

/**
 * Records an escalation delivery in the webhook_deliveries table for dashboard visibility
 * We'll use a built-in webhook endpoint that we know exists for displaying escalations
 */
async function recordEscalationDelivery(
    tenantId: string,
    integrationId: string,
    event: EscalationEvent,
    result: { ok: boolean; error?: string; id?: string; provider: string }
): Promise<void> {
    try {
        // Find appropriate webhook endpoint
        const { rows } = await query(
            `SELECT id FROM public.webhook_endpoints 
             WHERE tenant_id = $1 
             ORDER BY created_at DESC
             LIMIT 1`,
            [tenantId]
        );

        // If no webhook endpoint exists, we can't record the delivery
        if (!rows.length) {
            console.log(`⚠️ ESCALATION SERVICE: No webhook endpoints found for tenant ${tenantId}, skipping delivery recording`);
            return;
        }

        const webhookEndpointId = rows[0].id;
        console.log(`📝 ESCALATION SERVICE: Using existing webhook endpoint ${webhookEndpointId} for integration ${integrationId}`);

        // Generate a webhook-like payload
        const payload = {
            type: 'escalation.delivered',
            tenant_id: tenantId,
            data: {
                conversation_id: event.conversationId,
                integration_id: integrationId,
                reason: event.reason,
                confidence: event.confidence,
                status: result.ok ? 'delivered' : 'failed',
                triggered_at: new Date().toISOString()
            },
            timestamp: new Date().toISOString(),
            idempotency_key: crypto.randomUUID()
        };

        // Current timestamp
        const now = new Date();

        // Insert into webhook_deliveries table matching schema exactly
        await query(`
      INSERT INTO webhook_deliveries (
        id, webhook_endpoint_id, event_type, payload,
        response_status, response_body, delivery_attempts,
        delivered_at, failed_at, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3,
        $4, $5, 1,
        $6, $7, $8
      )
    `, [
            webhookEndpointId, // Using proper webhook endpoint ID
            'escalation.delivered', // event_type
            payload, // payload as jsonb
            result.ok ? 200 : 500, // response_status
            result.ok ? JSON.stringify(result) : result.error || 'Unknown error', // response_body
            result.ok ? now : null, // delivered_at
            !result.ok ? now : null, // failed_at
            now // created_at
        ]); console.log(`📝 ESCALATION SERVICE: Recorded delivery for integration ${integrationId}`);
    } catch (error) {
        console.error('❌ ESCALATION SERVICE: Failed to record escalation delivery:', error);
        // Non-critical, so continue execution
    }
}

export interface IntegrationConfig {
    provider: string;
    config: Record<string, unknown>;
}

export interface EscalationResult {
    ok: boolean;
    results?: Array<{
        provider: string;
        ok: boolean;
        id?: string;
        url?: string;
        error?: string;
        integrationId?: string; // Added for dashboard visibility
    }>;
    error?: string;
}

/**
 * Central escalation service that handles all escalation logic
 */
/**
 * Loads integration configuration by ID
 * @param integrationId The integration ID to load
 * @returns The integration configuration or null if not found
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadIntegrationConfig(integrationId: string): Promise<IntegrationConfig | null> {
    try {
        const { rows } = await query(
            `SELECT provider, config FROM public.integrations WHERE id = $1`,
            [integrationId]
        );

        if (rows.length > 0) {
            return {
                provider: rows[0].provider,
                config: rows[0].config || {}
            };
        }
        return null;
    } catch (error) {
        console.error('Failed to load integration config:', error);
        return null;
    }
}

/**
 * Loads escalation destinations for a tenant, optionally filtered by rule ID
 * @param tenantId The tenant ID
 * @param ruleId Optional rule ID to filter by
 * @returns Array of escalation destinations
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadEscalationDestinations(tenantId: string, ruleId?: string): Promise<EscalationDestination[]> {
    try {
        // If rule ID is provided, get destinations from that specific rule
        if (ruleId) {
            const { rows } = await query(
                `SELECT destinations FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                [ruleId, tenantId]
            );

            if (rows.length > 0 && rows[0].destinations) {
                return rows[0].destinations as EscalationDestination[];
            }
        }

        // Otherwise, get the default destinations for this tenant
        const { rows } = await query(
            `SELECT id, provider, config FROM public.integrations 
       WHERE tenant_id = $1 AND status = 'active' AND is_default = true`,
            [tenantId]
        );

        return rows.map(row => ({
            type: 'integration',
            integration_id: row.id
        }));
    } catch (error) {
        console.error('Failed to load escalation destinations:', error);
        return [];
    }
}

export async function handleEscalation({
    tenantId,
    conversationId,
    sessionId,
    userMessage,
    assistantAnswer,
    confidence,
    refs = [],
    reason,
    siteId = null,
    ruleId = null,
    matchedRuleDestinations = null,
    keywords = [],
    triggerWebhooks = true, // Whether to trigger webhooks
    integrationId = null, // For direct integration handling
    meta = {}
}: {
    tenantId: string;
    conversationId: string;
    sessionId?: string;
    userMessage: string;
    assistantAnswer?: string;
    confidence?: number;
    refs?: string[];
    reason: EscalationReason;
    siteId?: string | null;
    ruleId?: string | null;
    matchedRuleDestinations?: EscalationDestination[] | null;
    keywords?: string[];
    triggerWebhooks?: boolean;
    integrationId?: string | null;
    meta?: Record<string, unknown>;
}): Promise<EscalationResult> {
    console.log(`🚀 ESCALATION SERVICE: Starting for conversation ${conversationId}, reason: ${reason}`);

    // 1. Record the escalation event in the database
    try {
        await query(
            `INSERT INTO public.escalations 
      (tenant_id, conversation_id, reason, confidence, rule_id, created_at) 
      VALUES ($1, $2, $3, $4, $5, NOW())`,
            [tenantId, conversationId, reason, confidence || null, ruleId || null]
        );
        console.log(`📝 ESCALATION SERVICE: Recorded escalation event in database`);
    } catch (error) {
        console.error('❌ ESCALATION SERVICE: Failed to record escalation:', error);
        // Continue anyway - recording is helpful but not critical
    }

    // 2. Determine destinations (from rule, parameter, or default integrations)
    let escalationDestinations: EscalationDestination[] | null = matchedRuleDestinations;

    // If direct integration ID is provided, use that
    if (integrationId) {
        escalationDestinations = [{ integrationId }];
        console.log(`🔎 ESCALATION SERVICE: Using provided integration ID: ${integrationId}`);
    }
    // Otherwise, if no destinations provided, look them up
    else if (!escalationDestinations) {
        try {
            // If rule ID is provided, fetch its destinations
            if (ruleId) {
                const { rows } = await query(
                    `SELECT destinations FROM public.escalation_rules WHERE id = $1 AND tenant_id = $2`,
                    [ruleId, tenantId]
                );
                if (rows.length > 0 && rows[0].destinations) {
                    escalationDestinations = rows[0].destinations as EscalationDestination[];
                    console.log(`🔎 ESCALATION SERVICE: Using destinations from rule ${ruleId}: ${escalationDestinations?.length || 0} destinations`);
                }
            }
        } catch (error) {
            console.error('❌ ESCALATION SERVICE: Failed to fetch rule destinations:', error);
        }
    }

    // 3. If webhooks are requested, dispatch them before integration handling
    if (triggerWebhooks) {
        try {
            console.log(`📨 ESCALATION SERVICE: Triggering webhooks for escalation`);
            await webhookEvents.escalationTriggered(
                tenantId,
                conversationId,
                reason,
                confidence,
                userMessage
            );
            console.log(`✅ ESCALATION SERVICE: Webhooks triggered successfully`);
        } catch (error) {
            console.error('❌ ESCALATION SERVICE: Failed to trigger webhooks:', error);
        }
    } else {
        console.log(`ℹ️ ESCALATION SERVICE: Skipping webhooks as requested`);
    }

    // 4. Prepare the escalation event
    const event: EscalationEvent = {
        tenantId,
        conversationId,
        sessionId: sessionId || conversationId, // Fallback if sessionId not provided
        userMessage,
        assistantAnswer,
        confidence,
        refs,
        reason,
        ruleId: ruleId ?? undefined, // Convert null to undefined to match the EscalationEvent type
        meta: {
            ...meta,
            keywords,
            siteId
        }
    };

    // Add destinations if available
    if (escalationDestinations && escalationDestinations.length > 0) {
        // Convert rule destinations to the format expected by dispatch
        event.destinations = escalationDestinations.map((dest: EscalationDestination) => {
            if (dest.type === 'integration' && (dest.integration_id || dest.integrationId)) {
                const integrationId = dest.integration_id || dest.integrationId;
                if (!integrationId) {
                    return { destination: { type: 'integration' } };
                }
                return { integrationId };
            }
            else if (dest.type === 'email' && dest.email) {
                return { directEmail: dest.email, provider: 'email' };
            }
            return {
                destination: {
                    type: dest.type || 'unknown',
                    email: dest.email,
                    integration_id: dest.integration_id || dest.integrationId
                }
            };
        });
    }

    // 5. Dispatch to all destinations
    console.log(`📨 ESCALATION SERVICE: Dispatching to integrations (${event.destinations?.length || 0} destinations)`);

    try {
        const dispatchResult = await dispatchEscalation(event);
        console.log(`✅ ESCALATION SERVICE: Dispatch complete: ${JSON.stringify(dispatchResult)}`);

        // Record each integration dispatch in webhook_deliveries for dashboard visibility
        if (dispatchResult.ok && dispatchResult.results) {
            for (const result of dispatchResult.results) {
                // Only record if we have an integration ID
                if (result.integrationId) {
                    await recordEscalationDelivery(
                        tenantId,
                        result.integrationId,
                        event,
                        {
                            ok: result.ok,
                            error: result.error,
                            id: result.id,
                            provider: result.provider
                        }
                    );
                }
            }
        }

        return dispatchResult;
    } catch (error) {
        console.error('❌ ESCALATION SERVICE: Dispatch failed:', error);
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown error during dispatch'
        };
    }
}

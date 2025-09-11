import { dispatchEscalation } from './integrations/dispatch';
import { createNotification } from '@/lib/notifications';
import { EscalationEvent, EscalationReason } from './integrations/types';
import { query } from './db';
import { webhookEvents } from './webhooks';
import crypto from 'crypto';
import { logEvent } from '@/lib/events';

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
            return;
        }

        const webhookEndpointId = rows[0].id;

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
        ]);
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
 * 
 * Supports both automatic escalations (low confidence, rules) and manual escalations
 * with integration selection. Manual escalations can now specify which integrations
 * to use via matchedRuleDestinations, preventing "spam all integrations" behavior.
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
    // Escalation initiated (removed verbose console.log)

    // 1. Check for recent escalations to prevent duplicates
    try {
        const { rows: recentEscalations } = await query(
            `SELECT id, created_at FROM public.escalations 
             WHERE tenant_id = $1 AND conversation_id = $2 AND reason = $3
             AND created_at > NOW() - INTERVAL '1 minute'
             ORDER BY created_at DESC LIMIT 1`,
            [tenantId, conversationId, reason]
        );

        if (recentEscalations.length > 0) {
            console.log(`⏭️ Skipping duplicate escalation for conversation ${conversationId} - recent escalation found within 1 minute`);
            return {
                ok: true,
                skipped: true,
                reason: 'duplicate_prevention',
                existingEscalationId: recentEscalations[0].id
            } as EscalationResult & { skipped: boolean; existingEscalationId: string };
        }
    } catch (error) {
        console.error('❌ ESCALATION SERVICE: Failed to check for recent escalations:', error);
        // Continue anyway - deduplication is helpful but not critical
    }

    // 2. Record the escalation event in the database
    try {
        await query(
            `INSERT INTO public.escalations 
      (tenant_id, conversation_id, session_id, reason, confidence, rule_id, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [tenantId, conversationId, sessionId || null, reason, confidence || null, ruleId || null]
        );
        // Log escalation event
        logEvent({ tenantId, name: 'escalation_triggered', data: { conversationId, reason, confidence, ruleId }, soft: true });
        // Escalation event recorded
        // Fire a notification (MVP) - map reason to notification type
        try {
            const reasonTypeMap: Record<string, { type: string; severity: string; title: string; body?: string }> = {
                low_confidence: { type: 'escalation.low_confidence', severity: 'warning', title: 'Low-confidence escalation', body: 'A conversation was escalated due to low AI confidence.' },
                handoff: { type: 'escalation.handoff', severity: 'info', title: 'User requested human help', body: 'The user explicitly requested a human handoff.' },
                user_request: { type: 'escalation.request', severity: 'info', title: 'Conversation escalated', body: 'A conversation was escalated to the team.' },
                rule_match: { type: 'escalation.rule_match', severity: 'info', title: 'Rule-based escalation', body: 'An escalation rule matched and triggered a handoff.' },
                routing_rule: { type: 'routing.rule_match', severity: 'info', title: 'Routing rule matched', body: 'A routing rule directed this conversation.' }
            };
            const mapped = reasonTypeMap[reason] || reasonTypeMap['user_request'];
            // Creating notification for escalation
            await createNotification({
                tenantId,
                type: mapped.type,
                severity: mapped.severity as 'info' | 'success' | 'warning' | 'error' | 'critical',
                title: mapped.title,
                body: mapped.body,
                source: 'escalation',
                meta: { conversationId, ruleId, confidence, reason, isNotification: (meta && (meta as Record<string, unknown>)['isNotification']) }
            });
            // Notification creation result ignored in non-debug mode
        } catch (notifyErr) {
            console.error('⚠️ Failed to create escalation notification', notifyErr);
        }
    } catch (error) {
        console.error('❌ ESCALATION SERVICE: Failed to record escalation:', error);
        // Continue anyway - recording is helpful but not critical
    }

    // 3. Determine destinations (from rule, parameter, or default integrations)
    let escalationDestinations: EscalationDestination[] | null = matchedRuleDestinations;

    // If direct integration ID is provided, use that
    if (integrationId) {
        escalationDestinations = [{ integrationId }];
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
                    // Destinations loaded from rule
                }
            }
        } catch (error) {
            console.error('❌ ESCALATION SERVICE: Failed to fetch rule destinations:', error);
        }
    }

    // 4. If webhooks are requested, dispatch them before integration handling
    if (triggerWebhooks) {
        try {
            // Triggering webhooks for escalation with rule context
            await webhookEvents.escalationTriggered(
                tenantId,
                conversationId,
                reason,
                confidence,
                userMessage,
                ruleId || undefined,
                matchedRuleDestinations || undefined
            );
            // Webhooks triggered successfully
        } catch (error) {
            console.error('❌ ESCALATION SERVICE: Failed to trigger webhooks:', error);
        }
    } else {
        // Webhooks skipped as requested
    }

    // 5. Prepare the escalation event
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

    // 6. Dispatch to all destinations
    // Dispatching to integrations

    try {
        // Determine if this is a rule-based escalation that should skip fallback
        const isRuleBased = Boolean(ruleId || (matchedRuleDestinations && matchedRuleDestinations.length > 0));
        const skipFallback = isRuleBased;

        console.log(`📨 Dispatching ${isRuleBased ? 'rule-based' : 'automatic'} escalation (skipFallback: ${skipFallback})`);

        const dispatchResult = await dispatchEscalation(event, undefined, skipFallback);
        // Dispatch complete

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

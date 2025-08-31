import { query } from '@/lib/db';
import { EscalationReason } from '@/lib/integrations/types';
import crypto from 'crypto';

export type WebhookEvent = {
    type: 'conversation.started' | 'conversation.ended' | 'message.sent' | 'escalation.triggered' | 'rule.matched' | 'document.ingested' | 'site.verified';
    tenantId: string;
    data: Record<string, unknown>;
    timestamp?: string;
    idempotencyKey?: string;
};

export type WebhookEndpoint = {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    is_active: boolean;
    tenant_id: string;
};

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Get all active webhook endpoints for a tenant that are subscribed to an event type
 */
async function getWebhookEndpoints(tenantId: string, eventType: string): Promise<WebhookEndpoint[]> {
    // Fetching webhook endpoints

    const { rows } = await query(`
    SELECT id, url, events, secret, is_active, tenant_id
    FROM public.webhook_endpoints 
    WHERE tenant_id = $1 
      AND is_active = true 
      AND $2 = ANY(events)
    ORDER BY created_at ASC
  `, [tenantId, eventType]);

    // Found webhook endpoints

    return rows as WebhookEndpoint[];
}

/**
 * Create a webhook delivery record
 */
async function createWebhookDelivery(
    webhookEndpointId: string,
    event: WebhookEvent,
    attempt: number = 1
): Promise<string> {
    const { rows } = await query(`
    INSERT INTO public.webhook_deliveries (
      webhook_endpoint_id,
      event_type,
      payload,
      delivery_attempts,
      created_at
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING id
  `, [
        webhookEndpointId,
        event.type,
        JSON.stringify({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp || new Date().toISOString(),
            tenant_id: event.tenantId,
            idempotency_key: event.idempotencyKey || crypto.randomUUID()
        }),
        attempt
    ]);

    return rows[0].id;
}

/**
 * Update webhook delivery status
 */
async function updateWebhookDelivery(
    deliveryId: string,
    status: 'delivered' | 'failed',
    statusCode?: number,
    response?: string,
    error?: string
) {
    if (status === 'delivered') {
        await query(`
      UPDATE public.webhook_deliveries 
      SET delivered_at = NOW(), 
          response_status = $2,
          response_body = $3
      WHERE id = $1
    `, [deliveryId, statusCode, response]);
    } else {
        await query(`
      UPDATE public.webhook_deliveries 
      SET failed_at = NOW(), 
          response_status = $2,
          response_body = $3,
          delivery_attempts = delivery_attempts + 1
      WHERE id = $1
    `, [deliveryId, statusCode, error]);
    }
}

/**
 * Update webhook endpoint statistics
 */
async function updateWebhookStats(webhookEndpointId: string, success: boolean) {
    if (success) {
        await query(`
      UPDATE public.webhook_endpoints 
      SET last_success_at = NOW(), failure_count = 0
      WHERE id = $1
    `, [webhookEndpointId]);
    } else {
        await query(`
      UPDATE public.webhook_endpoints 
      SET last_failure_at = NOW(), failure_count = failure_count + 1
      WHERE id = $1
    `, [webhookEndpointId]);
    }
}

/**
 * Handle internal webhook URL processing
 * Format: internal://service/action/id
 */
async function processInternalWebhook(
    url: string,
    event: WebhookEvent,
    deliveryId: string
): Promise<boolean> {
    try {
        // Processing internal webhook

        // Parse URL: internal://service/action/id
        const urlWithoutProtocol = url.replace('internal://', '');
        const parts = urlWithoutProtocol.split('/');

        if (parts.length < 2) {
            console.error(`❌ Invalid internal webhook URL format: ${url}`);
            return false;
        }

        // Log the event data for debugging
        // Internal webhook payload (debug details removed)

        // Handle integration URLs - internal://integration/provider/id
        if (parts[0] === 'integration' && parts.length >= 3) {
            const provider = parts[1];
            const integrationId = parts[2];

            // Processing integration webhook

            // Get the integration details
            const { rows } = await query(`
                SELECT id, tenant_id, provider, name, config, status 
                FROM public.integrations
                WHERE id = $1 AND provider = $2
            `, [integrationId, provider]);

            if (rows.length === 0) {
                console.error(`❌ Integration not found: ${provider}/${integrationId}`);
                await updateWebhookDelivery(deliveryId, 'failed', undefined, undefined, 'Integration not found');
                return false;
            }

            const integration = rows[0] as {
                id: string;
                tenant_id: string;
                provider: 'email' | 'slack' | 'teams' | 'discord' | 'custom' | 'webhooks' | 'freshdesk' | 'zoho' | 'zendesk' | 'cherwell' | 'jira' | 'linear' | 'github' | 'gitlab' | 'servicenow';
                name: string;
                config: Record<string, unknown>;
                status: 'active' | 'disabled';
                credentials: Record<string, unknown>;
            };

            // Handle specific event types
            if (event.type === 'escalation.triggered' && event.data.conversation_id) {
                // Call escalate API directly - this is the simplest approach to ensure it works
                // Forwarding escalation to provider

                let userMessage = event.data.user_message || "No message available";
                let response;

                try {
                    // Import the integration dispatch functions
                    const { getProvider } = await import('./integrations/registry');

                    // Get conversation details including assistant answer
                    const { rows: conversations } = await query(`
                        SELECT c.id, c.session_id,
                            (SELECT content FROM public.messages 
                             WHERE conversation_id = c.id AND role = 'user' 
                             ORDER BY created_at DESC LIMIT 1) as user_message,
                            (SELECT content FROM public.messages 
                             WHERE conversation_id = c.id AND role = 'assistant' 
                             ORDER BY created_at DESC LIMIT 1) as assistant_answer
                        FROM public.conversations c
                        WHERE c.id = $1 AND c.tenant_id = $2
                    `, [event.data.conversation_id, event.tenantId]);

                    if (conversations.length === 0) {
                        throw new Error(`Conversation not found: ${event.data.conversation_id}`);
                    }

                    const conversation = conversations[0];
                    userMessage = conversation.user_message || event.data.user_message || "No message available";

                    // Validate that we have meaningful escalation context
                    // Don't send user-only escalations without AI response
                    if (!conversation.assistant_answer) {
                        console.log(`⏭️ Skipping user-only escalation for conversation ${event.data.conversation_id} - no AI response yet`);
                        await updateWebhookDelivery(deliveryId, 'delivered', 200, 'Skipped - no AI response');
                        await updateWebhookStats(integration.id, true);
                        return true; // Skip this integration
                    }

                    // Create escalation event with full context
                    const escalationEvent = {
                        tenantId: event.tenantId,
                        conversationId: String(event.data.conversation_id),
                        sessionId: conversation.session_id,
                        userMessage: String(userMessage),
                        assistantAnswer: conversation.assistant_answer,
                        confidence: typeof event.data.confidence === 'number' ? event.data.confidence : undefined,
                        reason: (event.data.reason as 'low_confidence' | 'restricted' | 'handoff' | 'user_request' | 'fallback_error' | 'feedback_urgent' | 'feedback_bug' | 'feedback_request') || 'user_request',
                        meta: {
                            fromWebhook: true,
                            webhookDeliveryId: deliveryId,
                            provider: integration.provider
                        }
                    };

                                    // Check if this escalation has rule-based destinations that should override
                // If this is a rule-based escalation, only forward to integrations that are in the rule destinations
                if (event.data.rule_id || (event.data.destinations && Array.isArray(event.data.destinations) && event.data.destinations.length > 0)) {
                    // This is a rule-based escalation - check if this integration should receive it
                    const ruleDestinations = event.data.destinations as Array<{provider?: string, id?: string}>;
                    const shouldReceive = ruleDestinations.some(dest => 
                        dest.provider === integration.provider || dest.id === integration.id
                    );
                    
                    if (!shouldReceive) {
                        console.log(`⏭️ Skipping ${integration.provider} integration (${integration.id}) - not in rule destinations`);
                        return true; // Skip this integration
                    }
                }

                // Forward directly to this specific integration's provider
                const provider = getProvider(integration.provider);
                if (!provider) {
                    throw new Error(`Provider not found: ${integration.provider}`);
                }

                console.log(`🎯 Forwarding escalation directly to ${integration.provider} integration (${integration.id})`);
                const result = await provider.sendEscalation(escalationEvent, integration);

                    // Simulate an HTTP response for compatibility with existing code
                    response = {
                        ok: result.ok,
                        status: result.ok ? 200 : 500,
                        text: async () => JSON.stringify(result)
                    } as Response;
                } catch (error) {
                    console.error('❌ Failed to fetch user message for escalation:', error);

                    // Fall back to original behavior without the message
                    const escalateUrl = process.env.SITE_URL ?
                        `${process.env.SITE_URL.replace(/\/$/, '')}/api/escalate` :
                        'http://localhost:3001/api/escalate';

                    response = await fetch(escalateUrl, {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            tenantId: event.tenantId,
                            conversationId: event.data.conversation_id,
                            reason: event.data.reason || 'webhook',
                            confidence: event.data.confidence,
                            integrationId: integrationId,
                            userMessage: "Error retrieving message", // Fallback message
                            fromWebhook: true // Add flag to prevent webhook loop
                        })
                    });
                }

                const responseText = await response.text().catch(() => '');

                if (response.ok) {
                    // Successfully forwarded escalation
                    await updateWebhookDelivery(deliveryId, 'delivered', response.status, responseText);
                    await updateWebhookStats(integration.id, true);
                    return true;
                } else {
                    console.error('❌ Failed to forward escalation:', responseText);
                    await updateWebhookDelivery(deliveryId, 'failed', response.status, undefined, `HTTP ${response.status}: ${responseText}`);
                    await updateWebhookStats(integration.id, false);
                    return false;
                }
            }

            // Other event types not yet supported for internal webhooks
            await updateWebhookDelivery(deliveryId, 'failed', undefined, undefined, `Event type ${event.type} not supported for internal webhooks`);
            return false;
        }

        console.error(`❌ Unsupported internal webhook service: ${parts[0]}`);
        await updateWebhookDelivery(deliveryId, 'failed', undefined, undefined, `Unsupported internal webhook service: ${parts[0]}`);
        return false;
    } catch (error) {
        console.error('❌ Error processing internal webhook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await updateWebhookDelivery(deliveryId, 'failed', undefined, undefined, errorMessage);
        return false;
    }
}

/**
 * Send webhook to a single endpoint
 */
async function sendWebhook(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<boolean> {
    // Starting webhook delivery

    const deliveryId = await createWebhookDelivery(endpoint.id, event);
    // Created delivery record

    try {
        // Special handling for internal webhooks
        if (endpoint.url.startsWith('internal://')) {
            // Detected internal webhook URL
            return processInternalWebhook(endpoint.url, event, deliveryId);
        }

        // Regular HTTP webhook processing below
        const payload = JSON.stringify({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp || new Date().toISOString(),
            tenant_id: event.tenantId,
            idempotency_key: event.idempotencyKey || crypto.randomUUID()
        });

        // Webhook payload prepared

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'helpNINJA-Webhooks/1.0',
            'X-Webhook-Event': event.type,
            'X-Webhook-Delivery': deliveryId,
            'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString()
        };

        // Add signature if endpoint has a secret
        if (endpoint.secret) {
            const signature = generateWebhookSignature(payload, endpoint.secret);
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
            // Added signature header
        }

        // Making HTTP request

        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers,
            body: payload,
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        // Webhook response received

        const responseText = await response.text().catch(() => '');

        if (response.ok) {
            // Webhook delivered successfully
            await updateWebhookDelivery(deliveryId, 'delivered', response.status, responseText);
            await updateWebhookStats(endpoint.id, true);
            return true;
        } else {
            // Webhook delivery failed
            await updateWebhookDelivery(deliveryId, 'failed', response.status, undefined, `HTTP ${response.status}: ${responseText}`);
            await updateWebhookStats(endpoint.id, false);
            return false;
        }
    } catch (error) {
        console.error(`💥 Webhook delivery error:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await updateWebhookDelivery(deliveryId, 'failed', undefined, undefined, errorMessage);
        await updateWebhookStats(endpoint.id, false);
        return false;
    }
}/**
 * Main function to dispatch webhooks for an event
 */
export async function dispatchWebhooks(event: WebhookEvent): Promise<void> {
    // Dispatching webhook event

    try {
        const endpoints = await getWebhookEndpoints(event.tenantId, event.type);

        // Found webhook endpoints for event

        if (endpoints.length === 0) {
            // No active webhook endpoints found
            return;
        }

        // Endpoint details omitted

        // Sending webhooks

        // Send webhooks in parallel
        const promises = endpoints.map((endpoint) => sendWebhook(endpoint, event));

        await Promise.allSettled(promises);
        // Webhook dispatch complete

    } catch (error) {
        console.error('💥 Error dispatching webhooks:', error);
    }
}

/**
 * Convenience functions for common events
 */
export const webhookEvents = {
    conversationStarted: (tenantId: string, conversationId: string, sessionId: string) =>
        dispatchWebhooks({
            type: 'conversation.started',
            tenantId,
            data: {
                conversation_id: conversationId,
                session_id: sessionId,
                started_at: new Date().toISOString()
            }
        }),

    conversationEnded: (tenantId: string, conversationId: string, sessionId: string, messageCount: number) =>
        dispatchWebhooks({
            type: 'conversation.ended',
            tenantId,
            data: {
                conversation_id: conversationId,
                session_id: sessionId,
                message_count: messageCount,
                ended_at: new Date().toISOString()
            }
        }),

    messageSent: (tenantId: string, conversationId: string, messageId: string, role: 'user' | 'assistant', confidence?: number) =>
        dispatchWebhooks({
            type: 'message.sent',
            tenantId,
            data: {
                conversation_id: conversationId,
                message_id: messageId,
                role,
                confidence,
                sent_at: new Date().toISOString()
            }
        }),

    escalationTriggered: async (
        tenantId: string, 
        conversationId: string, 
        reason: string, 
        confidence?: number, 
        userMessage?: string,
        ruleId?: string,
        ruleDestinations?: Array<{integrationId?: string, provider?: string, directEmail?: string}>
    ) => {
        // escalationTriggered webhook called

        // If we don't have the user message and we have a conversation ID, try to fetch it
        if (!userMessage && conversationId) {
            try {
                // Fetching user message from database
                // Get the latest user message from this conversation
                const { rows: messages } = await query(
                    `SELECT content FROM public.messages 
                     WHERE conversation_id = $1 
                     AND role = 'user' 
                     ORDER BY created_at DESC LIMIT 1`,
                    [conversationId]
                );

                userMessage = messages.length > 0 ? messages[0].content : undefined;
                // User message for escalation fetched
            } catch (error) {
                console.error('❌ Failed to fetch user message for escalation webhook:', error);
            }
        } else if (userMessage) {
            // Using provided user message
        }

        // Dispatching escalation.triggered webhook with rule context
        return dispatchWebhooks({
            type: 'escalation.triggered',
            tenantId,
            data: {
                conversation_id: conversationId,
                user_message: userMessage, // Include the user message if available
                reason,
                confidence,
                rule_id: ruleId, // Include rule ID if this is rule-based
                destinations: ruleDestinations, // Include rule destinations if available
                triggered_at: new Date().toISOString()
            }
        });
    },

    ruleMatched: (tenantId: string, ruleId: string, query: string, matchedAnswer: string) =>
        dispatchWebhooks({
            type: 'rule.matched',
            tenantId,
            data: {
                rule_id: ruleId,
                query,
                matched_answer: matchedAnswer,
                matched_at: new Date().toISOString()
            }
        }),

    documentIngested: (tenantId: string, documentId: string, url: string, chunkCount: number) =>
        dispatchWebhooks({
            type: 'document.ingested',
            tenantId,
            data: {
                document_id: documentId,
                url,
                chunk_count: chunkCount,
                ingested_at: new Date().toISOString()
            }
        }),

    siteVerified: (tenantId: string, siteId: string, domain: string) =>
        dispatchWebhooks({
            type: 'site.verified',
            tenantId,
            data: {
                site_id: siteId,
                domain,
                verified_at: new Date().toISOString()
            }
        })
};

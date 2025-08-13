import { query } from '@/lib/db';
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
    console.log(`🔍 Getting webhook endpoints for tenant ${tenantId} and event type ${eventType}`);

    const { rows } = await query(`
    SELECT id, url, events, secret, is_active, tenant_id
    FROM public.webhook_endpoints 
    WHERE tenant_id = $1 
      AND is_active = true 
      AND $2 = ANY(events)
    ORDER BY created_at ASC
  `, [tenantId, eventType]);

    console.log(`🔍 Found ${rows.length} webhook endpoints for event ${eventType}`);
    rows.forEach((row, index) => {
        console.log(`  Endpoint ${index + 1}: ${row.url}, events: ${JSON.stringify(row.events)}`);
    });

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
 * Send webhook to a single endpoint
 */
async function sendWebhook(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<boolean> {
    console.log(`🚀 Starting webhook delivery to ${endpoint.url} for event ${event.type}`);

    const deliveryId = await createWebhookDelivery(endpoint.id, event);
    console.log(`📝 Created delivery record: ${deliveryId}`);

    try {
        const payload = JSON.stringify({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp || new Date().toISOString(),
            tenant_id: event.tenantId,
            idempotency_key: event.idempotencyKey || crypto.randomUUID()
        });

        console.log(`📦 Webhook payload prepared:`, { type: event.type, dataKeys: Object.keys(event.data) });

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'HelpNinja-Webhooks/1.0',
            'X-Webhook-Event': event.type,
            'X-Webhook-Delivery': deliveryId,
            'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString()
        };

        // Add signature if endpoint has a secret
        if (endpoint.secret) {
            const signature = generateWebhookSignature(payload, endpoint.secret);
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
            console.log(`🔐 Added signature header`);
        }

        console.log(`🌐 Making HTTP request to: ${endpoint.url}`);

        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers,
            body: payload,
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        console.log(`📡 Response received: ${response.status} ${response.statusText}`);

        const responseText = await response.text().catch(() => '');

        if (response.ok) {
            console.log(`✅ Webhook delivered successfully`);
            await updateWebhookDelivery(deliveryId, 'delivered', response.status, responseText);
            await updateWebhookStats(endpoint.id, true);
            return true;
        } else {
            console.log(`❌ Webhook delivery failed: HTTP ${response.status}`);
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
    console.log(`🎯 Dispatching webhook event: ${event.type} for tenant ${event.tenantId}`);

    try {
        const endpoints = await getWebhookEndpoints(event.tenantId, event.type);

        console.log(`📋 Found ${endpoints.length} webhook endpoints for event ${event.type}`);

        if (endpoints.length === 0) {
            console.log(`⚠️ No active webhook endpoints found for event ${event.type} in tenant ${event.tenantId}`);
            return;
        }

        endpoints.forEach((endpoint, index) => {
            console.log(`🔗 Endpoint ${index + 1}: ${endpoint.id} (${endpoint.url}) - Active: ${endpoint.is_active}`);
        });

        console.log(`🚀 Sending webhooks to ${endpoints.length} endpoint(s)...`);

        // Send webhooks in parallel
        const promises = endpoints.map((endpoint, index) => {
            console.log(`📤 Starting webhook ${index + 1}/${endpoints.length} to ${endpoint.id}`);
            return sendWebhook(endpoint, event);
        });

        const results = await Promise.allSettled(promises);

        const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        const failed = results.length - successful;

        console.log(`✅ Webhook dispatch complete: ${successful} successful, ${failed} failed`);

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

    escalationTriggered: (tenantId: string, conversationId: string, reason: string, confidence?: number) =>
        dispatchWebhooks({
            type: 'escalation.triggered',
            tenantId,
            data: {
                conversation_id: conversationId,
                reason,
                confidence,
                triggered_at: new Date().toISOString()
            }
        }),

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

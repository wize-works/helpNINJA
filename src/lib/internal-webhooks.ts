/**
 * Internal webhook handlers for special URLs like internal://integration/...
 */

import { query } from '@/lib/db';
import { dispatchEscalation } from './integrations/dispatch';
import { EscalationEvent, EscalationReason, IntegrationRecord } from './integrations/types';

type WebhookPayload = {
    type: string;
    tenant_id: string;
    timestamp: string;
    idempotency_key?: string;
    data: Record<string, unknown>;
};

/**
 * Process an internal webhook URL
 * Format: internal://service/action/id
 */
export async function processInternalWebhook(
    url: string,
    payload: WebhookPayload,
    deliveryId: string
): Promise<boolean> {
    try {
        console.log(`🔄 Processing internal webhook ${url}`);

        // Parse URL: internal://service/action/id
        const urlWithoutProtocol = url.replace('internal://', '');
        const parts = urlWithoutProtocol.split('/');

        if (parts.length < 2) {
            console.error(`❌ Invalid internal webhook URL format: ${url}`);
            return false;
        }

        const [service, ...rest] = parts;

        switch (service) {
            case 'integration':
                return processIntegrationUrl(rest, payload, deliveryId);
            default:
                console.error(`❌ Unknown internal service: ${service}`);
                return false;
        }
    } catch (error) {
        console.error('❌ Error processing internal webhook:', error);
        return false;
    }
}

/**
 * Process integration service webhooks
 * Format: internal://integration/provider/id
 */
async function processIntegrationUrl(
    urlParts: string[],
    payload: WebhookPayload,
    _deliveryId: string // Not used but kept for consistent API
): Promise<boolean> {
    try {
        if (urlParts.length < 2) {
            console.error('❌ Invalid integration URL format. Expected: provider/id');
            return false;
        }

        const [provider, integrationId] = urlParts;
        console.log(`🔄 Processing ${provider} integration webhook for ID: ${integrationId}`);

        // Get the integration details
        const { rows } = await query(`
            SELECT id, tenant_id, provider, name, config, status
            FROM public.integrations
            WHERE id = $1 AND provider = $2
        `, [integrationId, provider]);

        if (rows.length === 0) {
            console.error(`❌ Integration not found: ${provider}/${integrationId}`);
            return false;
        }

        const integration = rows[0];

        // Check if the integration belongs to the tenant in the payload
        if (integration.tenant_id !== payload.tenant_id) {
            console.error(`❌ Tenant mismatch: ${integration.tenant_id} != ${payload.tenant_id}`);
            return false;
        }

        // Handle different event types
        switch (payload.type) {
            case 'escalation.triggered':
                return handleEscalationEvent(integration, payload);
            default:
                console.error(`❌ Unsupported event type for integration: ${payload.type}`);
                return false;
        }
    } catch (error) {
        console.error('❌ Error processing integration webhook:', error);
        return false;
    }
}

/**
 * Handle escalation events
 */
// Local type for DB records
type DbIntegrationRecord = {
    id: string;
    tenant_id: string;
    provider: string;
    name: string;
    config?: Record<string, unknown>;
    status: string;
};

/**
 * Handle escalation events
 */
async function handleEscalationEvent(
    integration: IntegrationRecord,
    payload: WebhookPayload
): Promise<boolean> {
    try {
        console.log(`🚨 Handling escalation event for integration: ${integration.name} (${integration.id})`);

        // Extract relevant data from the webhook payload
        const { conversation_id, reason, confidence } = payload.data;
        console.log(`📊 Event data: conversation=${conversation_id}, reason=${reason}, confidence=${confidence}`);

        // Extract conversation_id as string (we know this should be a string from the schema)
        const conversationId = typeof payload.data.conversation_id === 'string'
            ? payload.data.conversation_id
            : String(payload.data.conversation_id);

        // Get conversation details for more context
        const { rows: conversations } = await query(`
            SELECT c.id, c.session_id, c.tenant_id,
                  (SELECT content FROM public.messages 
                   WHERE conversation_id = c.id AND role = 'user' 
                   ORDER BY created_at DESC LIMIT 1) as user_message,
                  (SELECT content FROM public.messages 
                   WHERE conversation_id = c.id AND role = 'assistant' 
                   ORDER BY created_at DESC LIMIT 1) as assistant_answer
            FROM public.conversations c
            WHERE c.id = $1 AND c.tenant_id = $2
        `, [conversationId, payload.tenant_id]);

        if (conversations.length === 0) {
            console.error(`❌ Conversation not found: ${conversationId}`);
            return false;
        }

        const conversation = conversations[0];

        // Convert confidence to number if present
        const confidenceValue = typeof payload.data.confidence === 'number'
            ? payload.data.confidence
            : typeof payload.data.confidence === 'string'
                ? parseFloat(payload.data.confidence)
                : undefined;

        // Convert reason to a valid EscalationReason
        let reasonValue: EscalationReason = 'user_request'; // Default
        if (typeof payload.data.reason === 'string') {
            // Check if it's a valid EscalationReason
            switch (payload.data.reason) {
                case 'low_confidence':
                case 'restricted':
                case 'handoff':
                case 'user_request':
                case 'fallback_error':
                    reasonValue = payload.data.reason as EscalationReason;
                    break;
                default:
                    reasonValue = 'user_request'; // Default if not recognized
            }
        }

        // Prepare the escalation event
        // Create escalation event with properties that match the type definition
        const escalationEvent: EscalationEvent = {
            tenantId: payload.tenant_id,
            conversationId: conversationId,
            sessionId: conversation.session_id,
            userMessage: conversation.user_message || '',
            assistantAnswer: conversation.assistant_answer,
            confidence: confidenceValue,
            reason: reasonValue
        };

        // Add integration ID as a destination to tell dispatchEscalation which integration to use

        console.log(`📤 Dispatching escalation to ${integration.provider} integration: ${integration.id}`);

        // We already have the integration information
        // Just dispatch directly to the integration we already have
        const destinations = [{
            id: integration.id,
            tenant_id: integration.tenant_id,
            provider: integration.provider,
            name: integration.name,
            status: integration.status || 'active',
            config: integration.config || {},
            credentials: {}
        }];

        // Dispatch the escalation
        const result = await dispatchEscalation(escalationEvent, destinations);

        if (result.ok) {
            console.log(`✅ Successfully dispatched escalation`);
            return true;
        } else {
            console.error(`❌ Failed to dispatch escalation:`, result.error || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error('❌ Error handling escalation event:', error);
        return false;
    }
}

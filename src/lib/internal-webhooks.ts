/**
 * Internal webhook handlers for special URLs like internal://integration/...
 */

import { query } from '@/lib/db';
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
        // Processing internal webhook (debug log removed)

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _deliveryId: string // Not used but kept for consistent API
): Promise<boolean> {
    try {
        if (urlParts.length < 2) {
            console.error('❌ Invalid integration URL format. Expected: provider/id');
            return false;
        }

        const [provider, integrationId] = urlParts;
        // Processing integration webhook (debug log removed)

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

        const integrationRow = rows[0];

        // Convert query result to IntegrationRecord
        const integration: IntegrationRecord = {
            id: integrationRow.id,
            tenant_id: integrationRow.tenant_id,
            provider: integrationRow.provider,
            name: integrationRow.name,
            config: integrationRow.config || {},
            status: integrationRow.status || 'active',
            credentials: {}
        };

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

/**
 * Handle escalation events
 */
async function handleEscalationEvent(
    integration: IntegrationRecord,
    payload: WebhookPayload
): Promise<boolean> {
    try {
        // Handling escalation event (debug log removed)

        // Extract relevant data from the webhook payload
        // Event data fields removed from destructuring (debug logging removed)

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

        // Validate that we have meaningful escalation context
        // Don't send user-only escalations without AI response
        if (!conversation.assistant_answer) {
            console.log(`⏭️ Skipping user-only escalation for conversation ${conversationId} - no AI response yet`);
            return true; // Return success but don't actually send
        }

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
                case 'feedback_urgent':
                case 'feedback_bug':
                case 'feedback_request':
                    reasonValue = payload.data.reason as EscalationReason;
                    break;
                default:
                    reasonValue = 'user_request'; // Default if not recognized
            }
        }

        // Prepare the escalation parameters

        // Dispatching escalation (debug log removed)

        // Create escalation event with full context
        const event: EscalationEvent = {
            tenantId: payload.tenant_id,
            conversationId: conversationId,
            sessionId: conversation.session_id,
            userMessage: conversation.user_message || '',
            assistantAnswer: conversation.assistant_answer,
            confidence: confidenceValue,
            reason: reasonValue,
            meta: {
                fromWebhook: true,
                provider: integration.provider
            }
        };

        // Check if this escalation has rule-based destinations that should override
        // If this is a rule-based escalation, only forward to integrations that are in the rule destinations
        if (payload.data.rule_id || (payload.data.destinations && Array.isArray(payload.data.destinations) && payload.data.destinations.length > 0)) {
            // This is a rule-based escalation - check if this integration should receive it
            const ruleDestinations = payload.data.destinations as Array<{provider?: string, id?: string}>;
            const shouldReceive = ruleDestinations.some(dest => 
                dest.provider === integration.provider || dest.id === integration.id
            );
            
            if (!shouldReceive) {
                console.log(`⏭️ Skipping ${integration.provider} integration (${integration.id}) - not in rule destinations`);
                return true; // Skip this integration
            }
        }

        // Forward directly to this specific integration's provider
        const { getProvider } = await import('./integrations/registry');
        const provider = getProvider(integration.provider);
        if (!provider) {
            console.error(`❌ Provider not found: ${integration.provider}`);
            return false;
        }

        console.log(`🎯 Forwarding escalation directly to ${integration.provider} integration (${integration.id})`);
        const result = await provider.sendEscalation(event, integration);

        if (result.ok) {
            // Successfully dispatched escalation
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

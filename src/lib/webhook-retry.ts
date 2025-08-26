import { query } from '@/lib/db';

export const runtime = 'nodejs';

type WebhookEndpoint = {
    id: string;
    url: string;
    secret?: string;
    events: string[];
    is_active: boolean;
    tenant_id: string;
};

type WebhookEvent = {
    type: string;
    tenantId: string;
    data: Record<string, unknown>;
    timestamp?: string;
    idempotencyKey?: string;
};

/**
 * Retry failed webhook deliveries
 * This should be called periodically (e.g., via cron job or background task)
 */
export async function retryFailedWebhooks(): Promise<void> {
    try {
        // Retry strategy hard-coded in SQL intervals: 1min,5min,30min,2hrs,12hrs (max 5 attempts)

        const { rows: failedDeliveries } = await query(`
      SELECT 
        wd.id,
        wd.webhook_endpoint_id,
        wd.event_type,
        wd.payload,
        wd.delivery_attempts,
        wd.created_at,
        we.url,
        we.secret,
        we.tenant_id
      FROM public.webhook_deliveries wd
      JOIN public.webhook_endpoints we ON we.id = wd.webhook_endpoint_id
      WHERE wd.delivered_at IS NULL 
        AND wd.delivery_attempts < 5
        AND we.is_active = true
        AND wd.created_at > NOW() - INTERVAL '24 hours'
        AND (
          (wd.delivery_attempts = 1 AND wd.created_at <= NOW() - INTERVAL '1 minute') OR
          (wd.delivery_attempts = 2 AND wd.created_at <= NOW() - INTERVAL '5 minutes') OR
          (wd.delivery_attempts = 3 AND wd.created_at <= NOW() - INTERVAL '30 minutes') OR
          (wd.delivery_attempts = 4 AND wd.created_at <= NOW() - INTERVAL '2 hours') OR
          (wd.delivery_attempts = 5 AND wd.created_at <= NOW() - INTERVAL '12 hours')
        )
      ORDER BY wd.created_at ASC
      LIMIT 50
    `);

        // Found webhook deliveries to retry

        for (const delivery of failedDeliveries) {
            try {
                // Parse the original event from the payload
                const eventData = JSON.parse(delivery.payload);

                // Create a webhook endpoint object
                const endpoint: WebhookEndpoint = {
                    id: delivery.webhook_endpoint_id,
                    url: delivery.url,
                    secret: delivery.secret,
                    events: [delivery.event_type],
                    is_active: true,
                    tenant_id: delivery.tenant_id
                };

                // Create the event object for retry
                const event: WebhookEvent = {
                    type: delivery.event_type,
                    tenantId: delivery.tenant_id,
                    data: eventData.data,
                    timestamp: eventData.timestamp,
                    idempotencyKey: eventData.idempotency_key
                };

                // Retrying webhook delivery

                // Update attempt count before trying
                await query(`
          UPDATE public.webhook_deliveries 
          SET delivery_attempts = delivery_attempts + 1, 
              last_attempt_at = NOW()
          WHERE id = $1
        `, [delivery.id]);

                // Try to send the webhook
                await sendWebhookRetry(endpoint, event, delivery.id);
                // Retry result handled silently

            } catch (error) {
                console.error(`Error retrying webhook delivery ${delivery.id}:`, error);

                // Mark as failed
                await query(`
          UPDATE public.webhook_deliveries 
          SET failed_at = NOW(),
              error_message = $2
          WHERE id = $1
        `, [delivery.id, `Retry error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
            }
        }

    } catch (error) {
        console.error('Error in webhook retry process:', error);
    }
}

/**
 * Send webhook for retry (similar to sendWebhook but for existing delivery)
 */
async function sendWebhookRetry(endpoint: WebhookEndpoint, event: WebhookEvent, deliveryId: string): Promise<boolean> {
    try {
        const payload = JSON.stringify({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp,
            tenant_id: event.tenantId,
            idempotency_key: event.idempotencyKey
        });

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'helpNINJA-Webhooks/1.0',
            'X-Webhook-Event': event.type,
            'X-Webhook-Delivery': deliveryId,
            'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
            'X-Webhook-Retry': 'true'
        };

        // Add signature if endpoint has a secret
        if (endpoint.secret) {
            const crypto = await import('crypto');
            const signature = crypto.createHmac('sha256', endpoint.secret).update(payload).digest('hex');
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers,
            body: payload,
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        const responseText = await response.text().catch(() => '');

        if (response.ok) {
            // Update delivery as successful
            await query(`
        UPDATE public.webhook_deliveries 
        SET delivered_at = NOW(), 
            status_code = $2,
            response_body = $3
        WHERE id = $1
      `, [deliveryId, response.status, responseText]);

            // Update endpoint stats
            await query(`
        UPDATE public.webhook_endpoints 
        SET last_success_at = NOW(), failure_count = 0
        WHERE id = $1
      `, [endpoint.id]);

            return true;
        } else {
            // Update delivery as failed
            await query(`
        UPDATE public.webhook_deliveries 
        SET failed_at = NOW(), 
            status_code = $2,
            error_message = $3
        WHERE id = $1
      `, [deliveryId, response.status, `HTTP ${response.status}: ${responseText}`]);

            // Update endpoint stats
            await query(`
        UPDATE public.webhook_endpoints 
        SET last_failure_at = NOW(), failure_count = failure_count + 1
        WHERE id = $1
      `, [endpoint.id]);

            return false;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Update delivery as failed
        await query(`
      UPDATE public.webhook_deliveries 
      SET failed_at = NOW(),
          error_message = $2
      WHERE id = $1
    `, [deliveryId, errorMessage]);

        // Update endpoint stats
        await query(`
      UPDATE public.webhook_endpoints 
      SET last_failure_at = NOW(), failure_count = failure_count + 1
      WHERE id = $1
    `, [endpoint.id]);

        return false;
    }
}

/**
 * Clean up old webhook deliveries (older than 30 days)
 */
export async function cleanupOldWebhookDeliveries(): Promise<void> {
    try {
        await query(`
      DELETE FROM public.webhook_deliveries 
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);
        // Old webhook deliveries cleaned up
    } catch (error) {
        console.error('Error cleaning up old webhook deliveries:', error);
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
        }

        // Get webhook details
        const { rows: webhookRows } = await query(
            'SELECT id, name, url, secret, is_active FROM public.webhook_endpoints WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (webhookRows.length === 0) {
            return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
        }

        const webhook = webhookRows[0];

        if (!webhook.is_active) {
            return NextResponse.json({ error: 'Webhook is disabled' }, { status: 400 });
        }

        // Create test payload
        const testPayload = {
            event_type: 'webhook.test',
            timestamp: new Date().toISOString(),
            data: {
                message: 'This is a test webhook delivery',
                webhook_id: webhook.id,
                webhook_name: webhook.name,
                tenant_id: tenantId
            }
        };

        // Generate signature if webhook has a secret
        let signature = null;
        if (webhook.secret) {
            const hmac = crypto.createHmac('sha256', webhook.secret);
            hmac.update(JSON.stringify(testPayload));
            signature = `sha256=${hmac.digest('hex')}`;
        }

        // Prepare headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'helpNINJA-Webhooks/1.0'
        };

        if (signature) {
            headers['X-helpNINJA-Signature'] = signature;
        }

        // Record delivery attempt
        const { rows: deliveryRows } = await query(
            `INSERT INTO public.webhook_deliveries (webhook_endpoint_id, event_type, payload)
             VALUES ($1, $2, $3) 
             RETURNING id`,
            [webhook.id, 'webhook.test', JSON.stringify(testPayload)]
        );

        const deliveryId = deliveryRows[0].id;

        try {
            // Send webhook
            const startTime = Date.now();
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(testPayload),
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            const responseTime = Date.now() - startTime;
            const responseBody = await response.text();

            // Update delivery record
            if (response.ok) {
                await query(
                    `UPDATE public.webhook_deliveries 
                     SET delivered_at = NOW(), response_status = $1, response_body = $2
                     WHERE id = $3`,
                    [response.status, responseBody.substring(0, 1000), deliveryId] // Limit response body size
                );

                // Update webhook success timestamp
                await query(
                    'UPDATE public.webhook_endpoints SET last_success_at = NOW() WHERE id = $1',
                    [webhook.id]
                );

                return NextResponse.json({
                    success: true,
                    message: 'Webhook test sent successfully',
                    response_status: response.status,
                    response_time_ms: responseTime,
                    delivery_id: deliveryId
                });
            } else {
                // Handle HTTP error response
                await query(
                    `UPDATE public.webhook_deliveries 
                     SET failed_at = NOW(), response_status = $1, response_body = $2
                     WHERE id = $3`,
                    [response.status, responseBody.substring(0, 1000), deliveryId]
                );

                await query(
                    `UPDATE public.webhook_endpoints 
                     SET last_failure_at = NOW(), failure_count = failure_count + 1 
                     WHERE id = $1`,
                    [webhook.id]
                );

                return NextResponse.json({
                    success: false,
                    message: 'Webhook test failed',
                    response_status: response.status,
                    response_time_ms: responseTime,
                    response_body: responseBody.substring(0, 500),
                    delivery_id: deliveryId
                });
            }
        } catch (error) {
            // Handle network/timeout errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await query(
                `UPDATE public.webhook_deliveries 
                 SET failed_at = NOW(), response_body = $1
                 WHERE id = $2`,
                [errorMessage, deliveryId]
            );

            await query(
                `UPDATE public.webhook_endpoints 
                 SET last_failure_at = NOW(), failure_count = failure_count + 1 
                 WHERE id = $1`,
                [webhook.id]
            );

            return NextResponse.json({
                success: false,
                message: 'Webhook test failed',
                error: errorMessage,
                delivery_id: deliveryId
            });
        }
    } catch (error) {
        console.error('Error testing webhook:', error);
        return NextResponse.json({ error: 'Failed to test webhook' }, { status: 500 });
    }
}

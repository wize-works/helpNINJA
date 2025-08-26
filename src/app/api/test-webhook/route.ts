import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * Test webhook endpoint that validates signatures and logs events
 * This simulates a customer's webhook endpoint
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-webhook-signature');
        const delivery = req.headers.get('x-webhook-delivery');

        // Webhook received (debug log removed)

        // Parse the webhook payload
        let payload;
        try {
            payload = JSON.parse(body);
        } catch {
            console.error('❌ Invalid JSON payload');
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        // Validate signature if provided (simulate secret: 'test-secret')
        if (signature) {
            const expectedSignature = crypto.createHmac('sha256', 'test-secret')
                .update(body)
                .digest('hex');

            const providedSignature = signature.replace('sha256=', '');

            if (expectedSignature !== providedSignature) {
                console.error('❌ Invalid webhook signature');
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }

            // Webhook signature validated
        }

        // Log the event details
        // Webhook payload details removed

        // Simulate processing based on event type
        switch (payload.type) {
            case 'conversation.started':
                // conversation.started
                break;
            case 'conversation.ended':
                // conversation.ended
                break;
            case 'message.sent':
                // message.sent
                break;
            case 'escalation.triggered':
                // escalation.triggered
                break;
            case 'document.ingested':
                // document.ingested
                break;
            case 'rule.matched':
                // rule.matched
                break;
            case 'site.verified':
                // site.verified
                break;
            default:
            // unknown event type
        }

        // Return success response
        return NextResponse.json({
            received: true,
            event: payload.type,
            delivery_id: delivery,
            processed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle other methods
export async function GET() {
    return NextResponse.json({
        message: 'Test webhook endpoint',
        methods: ['POST'],
        expected_headers: [
            'x-webhook-signature',
            'x-webhook-event',
            'x-webhook-delivery',
            'x-webhook-timestamp'
        ],
        test_secret: 'test-secret'
    });
}

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
        const event = req.headers.get('x-webhook-event');
        const delivery = req.headers.get('x-webhook-delivery');
        const timestamp = req.headers.get('x-webhook-timestamp');
        const isRetry = req.headers.get('x-webhook-retry') === 'true';

        console.log('🎯 Webhook received:', {
            event,
            delivery,
            timestamp,
            isRetry,
            hasSignature: !!signature,
            bodyLength: body.length
        });

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

            console.log('✅ Webhook signature validated');
        }

        // Log the event details
        console.log('📦 Webhook payload:', {
            type: payload.type,
            tenant_id: payload.tenant_id,
            timestamp: payload.timestamp,
            idempotency_key: payload.idempotency_key,
            data: payload.data
        });

        // Simulate processing based on event type
        switch (payload.type) {
            case 'conversation.started':
                console.log(`🟢 New conversation started: ${payload.data.conversation_id}`);
                break;
            case 'conversation.ended':
                console.log(`🔴 Conversation ended: ${payload.data.conversation_id} (${payload.data.message_count} messages)`);
                break;
            case 'message.sent':
                console.log(`💬 Message sent: ${payload.data.role} message in ${payload.data.conversation_id}`);
                break;
            case 'escalation.triggered':
                console.log(`🚨 Escalation triggered: ${payload.data.reason} (confidence: ${payload.data.confidence})`);
                break;
            case 'document.ingested':
                console.log(`📄 Document ingested: ${payload.data.url} (${payload.data.chunk_count} chunks)`);
                break;
            case 'rule.matched':
                console.log(`🎯 Rule matched: ${payload.data.rule_id}`);
                break;
            case 'site.verified':
                console.log(`✅ Site verified: ${payload.data.domain}`);
                break;
            default:
                console.log(`❓ Unknown event type: ${payload.type}`);
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

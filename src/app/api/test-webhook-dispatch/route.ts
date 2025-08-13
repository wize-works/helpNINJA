import { NextResponse } from 'next/server';
import { webhookEvents } from '@/lib/webhooks';

export const runtime = 'nodejs';

export async function POST() {
    try {
        console.log('🧪 Test webhook: Starting direct webhook dispatch test');

        const tenantId = 'd5e3d78f-d52d-4d60-9849-47371f46f205';
        const conversationId = 'test-conversation-123';
        const messageId = 'test-message-456';

        console.log(`🧪 Test webhook: Calling webhookEvents.messageSent with tenantId=${tenantId}`);

        await webhookEvents.messageSent(tenantId, conversationId, messageId, 'user');

        console.log('🧪 Test webhook: Webhook dispatch completed');

        return NextResponse.json({
            success: true,
            message: 'Test webhook dispatch completed',
            tenantId,
            conversationId,
            messageId
        });

    } catch (error) {
        console.error('🧪 Test webhook: Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

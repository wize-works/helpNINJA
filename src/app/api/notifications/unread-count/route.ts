import { NextResponse } from 'next/server';
import { getUnreadCount, resolveUserAndTenant } from '@/lib/notifications';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const { userId, tenantId } = await resolveUserAndTenant();
        const count = await getUnreadCount(tenantId, userId);
        return NextResponse.json({ count });
    } catch (error) {
        console.error('Unread count failed:', error);
        return NextResponse.json({ error: 'failed_to_get_unread_count' }, { status: 500 });
    }
}

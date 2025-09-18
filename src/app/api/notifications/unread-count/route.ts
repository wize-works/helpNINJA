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
        const msg = (error as { message?: string })?.message || '';
        if (msg === 'unauthenticated' || msg === 'user_not_found') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'failed_to_get_unread_count' }, { status: 500 });
    }
}

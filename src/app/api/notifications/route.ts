import { NextRequest, NextResponse } from 'next/server';
import { listNotifications, resolveUserAndTenant } from '@/lib/notifications';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const { userId, tenantId } = await resolveUserAndTenant();
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get('cursor') || undefined;
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
        const { notifications, nextCursor } = await listNotifications(tenantId, userId, limit, cursor);
        return NextResponse.json({ notifications, nextCursor });
    } catch (error) {
        console.error('Notifications list failed:', error);
        return NextResponse.json({ error: 'failed_to_list_notifications' }, { status: 500 });
    }
}

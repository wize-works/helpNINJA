import { NextResponse } from 'next/server';
import { markAllRead, resolveUserAndTenant } from '@/lib/notifications';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const { userId, tenantId } = await resolveUserAndTenant();
        const result = await markAllRead(tenantId, userId);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Mark all read failed:', error);
        return NextResponse.json({ error: 'failed_to_mark_all_read' }, { status: 500 });
    }
}

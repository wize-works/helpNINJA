import { NextRequest, NextResponse } from 'next/server';
import { markNotificationRead, resolveUserAndTenant } from '@/lib/notifications';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, ctx: Context) {
    try {
        const { userId, tenantId } = await resolveUserAndTenant();
        const { id } = await ctx.params;
        await markNotificationRead(tenantId, id, userId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'not_found') {
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        console.error('Mark read failed:', error);
        return NextResponse.json({ error: 'failed_to_mark_read' }, { status: 500 });
    }
}

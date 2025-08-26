import { NextRequest, NextResponse } from 'next/server';
import { assertInternalServiceKey, createNotification } from '@/lib/notifications';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        assertInternalServiceKey(req as unknown as Request);
        const body = await req.json();
        const { tenantId, type, title } = body;
        if (!tenantId || !type || !title) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
        const result = await createNotification({ tenantId, type, title, body: body.body, severity: body.severity, meta: body.meta, source: body.source || 'system', eventKey: body.eventKey, groupKey: body.groupKey, dedupeWindowSecs: body.dedupeWindowSecs || 0, broadcast: body.broadcast !== false, userIds: body.userIds });
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof Error && error.message === 'unauthorized') {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Internal notification create failed:', error);
        return NextResponse.json({ error: 'failed_to_create_internal_notification' }, { status: 500 });
    }
}

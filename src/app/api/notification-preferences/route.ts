import { NextRequest, NextResponse } from 'next/server';
import { getPreferences, upsertPreferences, resolveUserAndTenant } from '@/lib/notifications';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const { userId, tenantId } = await resolveUserAndTenant();
        const prefs = await getPreferences(tenantId, userId);
        return NextResponse.json({ preferences: prefs });
    } catch (error) {
        console.error('Get preferences failed:', error);
        return NextResponse.json({ error: 'failed_to_get_preferences' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId, tenantId } = await resolveUserAndTenant();
        const body = await req.json();
        const prefs = body?.preferences || [];
        const result = await upsertPreferences(tenantId, userId, prefs);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Update preferences failed:', error);
        return NextResponse.json({ error: 'failed_to_update_preferences' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTenantIdStrict } from '@/lib/tenant-resolve'
import { trackActivity } from '@/lib/activity-tracker'

export const runtime = 'nodejs'

export async function GET() {
    // Track user activity for tenant info viewing
    await trackActivity();

    let tenantId: string
    try {
        tenantId = await getTenantIdStrict()
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message || 'unauthorized' }, { status: 401 })
    }

    try {
        const { rows } = await query<{ public_key: string | null; name: string; plan: string; plan_status: string }>(
            'select public_key, name, plan, plan_status from public.tenants where id=$1',
            [tenantId]
        )
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
        }
        const t = rows[0]
        return NextResponse.json({
            public_key: t.public_key,
            name: t.name,
            plan: t.plan,
            plan_status: t.plan_status
        })
    } catch (e) {
        console.error('tenant info error', e)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

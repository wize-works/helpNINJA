import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
    const tenantId = req.headers.get('x-tenant-id') || undefined
    if (!tenantId) {
        return NextResponse.json({ error: 'Missing x-tenant-id' }, { status: 400 })
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

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { resolveTenantIdFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Context) {
    const tenantId = await resolveTenantIdFromRequest(req, true)
    const { id } = await ctx.params
    const body = await req.json() as { status?: 'active' | 'disabled' }
    if (!body.status) return NextResponse.json({ error: 'status required' }, { status: 400 })
    await query('update public.integrations set status=$1 where id=$2 and tenant_id=$3', [body.status, id, tenantId])
    return NextResponse.json({ ok: true })
}

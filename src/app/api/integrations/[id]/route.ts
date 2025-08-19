import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTenantIdStrict } from '@/lib/tenant-resolve'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, ctx: Context) {
    const tenantId = await getTenantIdStrict()
    const { id } = await ctx.params
    await query('delete from public.integrations where id=$1 and tenant_id=$2', [id, tenantId])
    return NextResponse.json({ ok: true })
}

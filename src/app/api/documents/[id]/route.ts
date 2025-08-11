import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { resolveTenantIdFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, ctx: Context) {
    const tenantId = await resolveTenantIdFromRequest(req, true)
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    try {
        await query('delete from public.chunks where tenant_id=$1 and document_id=$2', [tenantId, id])
        await query('delete from public.documents where tenant_id=$1 and id=$2', [tenantId, id])
        return NextResponse.json({ ok: true })
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: Context) {
    const { id } = await ctx.params
    // Only rotate if columns exist
    const cols = await query<{ column_name: string }>(
        `select column_name from information_schema.columns where table_schema='public' and table_name='tenants' and column_name in ('public_key','secret_key')`
    )
    if (cols.rowCount === 0) return NextResponse.json({ ok: true, skipped: true })
    const hasPK = cols.rows.some(r => r.column_name === 'public_key')
    const hasSK = cols.rows.some(r => r.column_name === 'secret_key')
    const updates: string[] = []
    const paramsArr: unknown[] = [id]
    if (hasPK) { updates.push(`public_key = 'hn_pk_' || encode(gen_random_bytes(18), 'hex')`) }
    if (hasSK) { updates.push(`secret_key = 'hn_sk_' || encode(gen_random_bytes(24), 'hex')`) }
    if (updates.length) {
        await query(`update public.tenants set ${updates.join(', ')} where id=$1`, paramsArr)
    }
    return NextResponse.json({ ok: true })
}

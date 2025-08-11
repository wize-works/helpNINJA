import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getProvider } from '@/lib/integrations/registry'
import type { EscalationEvent, IntegrationRecord } from '@/lib/integrations/types'

export const runtime = 'nodejs'

type OutboxRow = {
    id: string
    tenant_id: string
    provider: IntegrationRecord['provider']
    integration_id: string | null
    payload: EscalationEvent
    attempts: number
}

function minsFromAttempts(attempts: number): number {
    // 2,4,8,16,32,60 (cap)
    return Math.min(Math.pow(2, Math.max(1, attempts + 1)), 60)
}

export async function POST(req: NextRequest) {
    const key = req.headers.get('x-cron-key') || ''
    if ((process.env.CRON_SECRET || '') && key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { rows } = await query<OutboxRow>(
        `select id, tenant_id, provider, integration_id, payload, attempts
     from public.integration_outbox
     where status='pending' and next_attempt_at <= now()
     order by next_attempt_at asc
     limit 10`
    )

    const results = [] as Array<{ id: string; ok: boolean; error?: string }>

    for (const row of rows) {
        try {
            let integ: IntegrationRecord | null = null
            if (row.integration_id) {
                const ds = await query<IntegrationRecord>(`select * from public.integrations where id=$1 and tenant_id=$2 and status='active'`, [row.integration_id, row.tenant_id])
                integ = ds.rows[0] ?? null
            }
            // env fallbacks if not configured in DB
            if (!integ) {
                if (row.provider === 'email' && process.env.SUPPORT_FALLBACK_TO_EMAIL) {
                    integ = { id: 'env-email', tenant_id: row.tenant_id, provider: 'email', name: 'env-email', status: 'active', credentials: {}, config: { to: process.env.SUPPORT_FALLBACK_TO_EMAIL, from: process.env.SUPPORT_FROM_EMAIL } }
                } else if (row.provider === 'slack' && process.env.SLACK_WEBHOOK_URL) {
                    integ = { id: 'env-slack', tenant_id: row.tenant_id, provider: 'slack', name: 'env-slack', status: 'active', credentials: { webhook_url: process.env.SLACK_WEBHOOK_URL }, config: {} }
                }
            }
            if (!integ) {
                await query(`update public.integration_outbox set status='failed', last_error=$2 where id=$1`, [row.id, 'no destination configured'])
                results.push({ id: row.id, ok: false, error: 'no destination configured' })
                continue
            }
            const provider = getProvider(row.provider)
            if (!provider) {
                await query(`update public.integration_outbox set status='failed', last_error=$2 where id=$1`, [row.id, 'provider not registered'])
                results.push({ id: row.id, ok: false, error: 'provider not registered' })
                continue
            }
            const r = await provider.sendEscalation(row.payload, integ)
            if (r.ok) {
                await query(`update public.integration_outbox set status='sent', attempts=attempts+1, sent_at=now(), last_error=null where id=$1`, [row.id])
                results.push({ id: row.id, ok: true })
            } else {
                const mins = minsFromAttempts(row.attempts)
                await query(
                    `update public.integration_outbox set attempts=attempts+1, next_attempt_at = now() + ($2 || ' minutes')::interval, last_error=$3 where id=$1`,
                    [row.id, String(mins), r.error || 'unknown']
                )
                results.push({ id: row.id, ok: false, error: r.error })
            }
        } catch (e) {
            const msg = (e as Error).message
            const mins = minsFromAttempts(row.attempts)
            await query(
                `update public.integration_outbox set attempts=attempts+1, next_attempt_at = now() + ($2 || ' minutes')::interval, last_error=$3 where id=$1`,
                [row.id, String(mins), msg]
            )
            results.push({ id: row.id, ok: false, error: msg })
        }
    }

    return NextResponse.json({ processed: results.length, results })
}

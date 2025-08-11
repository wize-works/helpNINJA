import { EscalationEvent, IntegrationRecord } from './types'
import { getProvider } from './registry'
import { query } from '@/lib/db'

export async function loadDestinations(tenantId: string): Promise<IntegrationRecord[]> {
    const { rows } = await query<IntegrationRecord>('select * from public.integrations where tenant_id=$1 and status=' + "'active'", [tenantId])
    return rows
}

export async function dispatchEscalation(ev: EscalationEvent, destinations?: IntegrationRecord[]) {
    const targets = destinations || await loadDestinations(ev.tenantId)
    const fallbacks: IntegrationRecord[] = []
    if (!targets.length) {
        if (process.env.SUPPORT_FALLBACK_TO_EMAIL) fallbacks.push({ id: 'env-email', tenant_id: ev.tenantId, provider: 'email', name: 'env-email', status: 'active', credentials: {}, config: { to: process.env.SUPPORT_FALLBACK_TO_EMAIL, from: process.env.SUPPORT_FROM_EMAIL } } as IntegrationRecord)
        if (process.env.SLACK_WEBHOOK_URL) fallbacks.push({ id: 'env-slack', tenant_id: ev.tenantId, provider: 'slack', name: 'env-slack', status: 'active', credentials: { webhook_url: process.env.SLACK_WEBHOOK_URL }, config: {} } as IntegrationRecord)
    }
    const list = targets.length ? targets : fallbacks
    if (!list.length) return { ok: false, error: 'no destinations configured' }

    const results = await Promise.all(list.map(async t => {
        const p = getProvider(t.provider)
        if (!p) return { provider: t.provider, ok: false, error: 'provider_not_registered' }
        const r = await p.sendEscalation(ev, t)
        if (!r.ok) {
            await query(
                'insert into public.integration_outbox (tenant_id, provider, integration_id, payload, status, attempts, next_attempt_at, last_error) values ($1,$2,$3,$4,\'pending\',0, now() + interval \'2 minutes\', $5)',
                [ev.tenantId, t.provider, t.id, ev, r.error || 'unknown']
            )
        }
        return { provider: t.provider, ...r }
    }))
    return { ok: results.some(r => r.ok), results }
}

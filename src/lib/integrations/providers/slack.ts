import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function text(ev: EscalationEvent) {
    const refs = (ev.refs || []).map(u => `• <${u}|ref>`).join('\n')
    return `*Reason:* ${ev.reason}
*Confidence:* ${ev.confidence ?? 'n/a'}
*Session:* ${ev.sessionId}
*User:* ${ev.userMessage}
*Answer:* ${ev.assistantAnswer || '—'}
${refs ? `*Refs:*\n${refs}` : ''}
<${process.env.SITE_URL}/conversations/${ev.conversationId}|Open in dashboard>`
}

const slackProvider: Provider = {
    key: 'slack',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        const webhook = (i.credentials?.webhook_url as string) || process.env.SLACK_WEBHOOK_URL
        if (!webhook) return { ok: false, error: 'no slack webhook configured' }
        const payload = { text: 'helpNINJA escalation', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: text(ev) } }] }
        try {
            const res = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
            if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
            return { ok: true }
        } catch (e) { return { ok: false, error: (e as Error).message } }
    }
}
export default slackProvider

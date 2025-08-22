import { Resend } from 'resend'
import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function subject(ev: EscalationEvent) {
    return `helpNINJA Escalation — ${ev.reason} — ${ev.sessionId.slice(0, 6)}`
}
function body(ev: EscalationEvent) {
    const refs = (ev.refs || []).map(u => `- ${u}`).join('')
    return [
        `Reason: ${ev.reason}`,
        `Confidence: ${ev.confidence ?? 'n/a'}`,
        `Session: ${ev.sessionId}`,
        `Conversation: ${ev.conversationId}`,
        '',
        'User message:', ev.userMessage,
        '',
        'Assistant answer:', ev.assistantAnswer || '—',
        '',
        'References:', refs || '—',
        '',
        `Open: ${process.env.SITE_URL}/conversations/${ev.conversationId}`
    ].join('')
}

const emailProvider: Provider = {
    key: 'email',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL
        const bcc = "bkorous@gmail.com";
        const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app'
        if (!to) return { ok: false, error: 'no email recipient configured' }

        // Initialize Resend only when needed at runtime
        const resend = new Resend(process.env.RESEND_API_KEY!)

        try {
            const r = await resend.emails.send({ to, bcc, from, subject: subject(ev), text: body(ev) })
            return { ok: true, id: (r as { id?: string }).id }
        } catch (e) { return { ok: false, error: (e as Error).message } }
    }
}
export default emailProvider
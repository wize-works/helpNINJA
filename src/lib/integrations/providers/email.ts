import { Resend } from 'resend'
import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function subject(ev: EscalationEvent) {
    return `helpNINJA Escalation — ${ev.reason || 'Unknown'} — ${(ev.sessionId || 'Unknown').slice(0, 6)}`;
}

function body(ev: EscalationEvent) {
    // Use the correct properties from the EscalationEvent type
    const reason = ev.reason || 'Unknown';
    const confidence = typeof ev.confidence === 'number' ? ev.confidence : 'n/a';
    const sessionId = ev.sessionId || 'Unknown';
    const conversationId = ev.conversationId || 'Unknown';
    const userMessage = ev.userMessage || 'No message available';
    const assistantAnswer = ev.assistantAnswer || '—';
    const refs = (ev.refs || []).map(u => `- ${u}`).join('\n') || '—';

    return [
        `Reason: ${reason}`,
        `Confidence: ${confidence}`,
        `Session: ${sessionId}`,
        `Conversation: ${conversationId}`,
        '',
        'User message:', userMessage,
        '',
        'Assistant answer:', assistantAnswer,
        '',
        'References:', refs,
        '',
        `Open: ${process.env.SITE_URL}/conversations/${conversationId}`
    ].join('\n');
}

const emailProvider: Provider = {
    key: 'email',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        // Log the received event for debugging
        console.log('📧 Email provider received event:', JSON.stringify(ev, null, 2));

        const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL;
        const bcc = "bkorous@gmail.com";
        const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app';

        if (!to) return { ok: false, error: 'no email recipient configured' };

        // Initialize Resend only when needed at runtime
        const resend = new Resend(process.env.RESEND_API_KEY!);

        try {
            const emailSubject = subject(ev);
            const emailBody = body(ev);

            // Log the email we're about to send
            console.log(`📧 Sending email to ${to} with subject: ${emailSubject}`);

            const r = await resend.emails.send({
                to,
                bcc,
                from,
                subject: emailSubject,
                text: emailBody
            });

            console.log('📧 Email sent successfully:', r);
            return { ok: true, id: (r as { id?: string }).id };
        } catch (e) {
            console.error('📧 Email sending failed:', e);
            return { ok: false, error: (e as Error).message };
        }
    }
};

export default emailProvider;
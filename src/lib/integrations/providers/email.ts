import { Resend } from 'resend'
import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function subject(ev: EscalationEvent) {
    // Get reason from ev.data or fall back to ev.reason for backward compatibility
    const reason = ev.data?.reason || ev.reason || 'Unknown';
    // Use a safe approach for sessionId which might not exist
    const sessionId = ev.sessionId || ev.data?.session_id || 'Unknown';
    return `helpNINJA Escalation — ${reason} — ${sessionId.slice(0, 6)}`;
}

function body(ev: EscalationEvent) {
    // Extract data from the actual payload structure
    const reason = ev.data?.reason || ev.reason || 'Unknown';
    const confidence = ev.data?.confidence || ev.confidence || 'n/a';
    const sessionId = ev.sessionId || ev.data?.session_id || 'Unknown';
    const conversationId = ev.data?.conversation_id || ev.conversationId || 'Unknown';
    const userMessage = ev.userMessage || ev.data?.user_message || 'No message available';
    const assistantAnswer = ev.assistantAnswer || ev.data?.assistant_answer || '—';
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
        console.log('📧 Email provider received event:', JSON.stringify(ev, null, 2));

        const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL;
        const bcc = "bkorous@gmail.com";
        const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app';

        if (!to) return { ok: false, error: 'no email recipient configured' };

        // Initialize Resend only when needed at runtime
        const resend = new Resend(process.env.RESEND_API_KEY!);

        try {
            const r = await resend.emails.send({
                to,
                bcc,
                from,
                subject: subject(ev),
                text: body(ev)
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
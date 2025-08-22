import { Resend } from 'resend'
import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function subject(ev: EscalationEvent) {
    // Get reason from event
    const reason = ev.reason || 'Unknown';
    // Use a safe approach for sessionId which might not exist
    const sessionId = ev.sessionId || 'Unknown';
    const shortId = typeof sessionId === 'string' ? sessionId.slice(0, 6) : 'Unknown';
    return `helpNINJA Escalation — ${reason} — ${shortId}`;
}

function body(ev: EscalationEvent) {
    // Extract data from the event
    const reason = ev.reason || 'Unknown';
    const confidence = typeof ev.confidence === 'number' ? ev.confidence.toFixed(2) : 'n/a';
    const sessionId = ev.sessionId || 'Unknown';
    const conversationId = ev.conversationId || 'Unknown';
    const userMessage = ev.userMessage || 'No message available';
    const assistantAnswer = ev.assistantAnswer || '—';

    // Handle references (URLs)
    let refsText = '—';
    if (Array.isArray(ev.refs) && ev.refs.length > 0) {
        refsText = ev.refs.map(u => `- ${u}`).join('\n');
    }

    // Build the email body
    return [
        `Reason: ${reason}`,
        `Confidence: ${confidence}`,
        `Session: ${sessionId}`,
        `Conversation: ${conversationId}`,
        '',
        'User message:',
        userMessage,
        '',
        'Assistant answer:',
        assistantAnswer,
        '',
        'References:',
        refsText,
        '',
        `Open: ${process.env.SITE_URL || 'http://localhost:3001'}/conversations/${conversationId}`
    ].join('\n');
}

const emailProvider: Provider = {
    key: 'email',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        console.log('📧 Email provider processing escalation event');
        console.log(`Event details: reason=${ev.reason}, conversation=${ev.conversationId}, confidence=${ev.confidence}`);

        // Get recipient from integration config or fallback to environment variable
        const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL;
        const bcc = "bkorous@gmail.com"; // Hard-coded BCC for monitoring
        const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app';

        if (!to) {
            console.error('📧 No email recipient configured');
            return { ok: false, error: 'no_recipient' };
        }

        if (!process.env.RESEND_API_KEY) {
            console.error('📧 Missing RESEND_API_KEY environment variable');
            return { ok: false, error: 'missing_api_key' };
        }

        console.log(`📧 Sending email to ${to} from ${from}`);

        try {
            // Initialize Resend only when needed at runtime
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Create email content
            const emailSubject = subject(ev);
            const emailBody = body(ev);

            console.log(`📧 Email subject: ${emailSubject}`);

            // Send the email
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
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
        console.log('📧 EMAIL DEBUG [1]: Email provider processing escalation event');
        console.log(`📧 EMAIL DEBUG [2]: Full event payload: ${JSON.stringify(ev)}`);
        console.log(`📧 EMAIL DEBUG [3]: Integration config: ${JSON.stringify(i.config)}`);
        console.log(`📧 EMAIL DEBUG [4]: Event details: reason=${ev.reason}, conversation=${ev.conversationId}, confidence=${ev.confidence}`);

        // Get recipient from integration config or fallback to environment variable
        const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL;
        const bcc = "bkorous@gmail.com"; // Hard-coded BCC for monitoring
        const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app';

        console.log(`📧 EMAIL DEBUG [5]: Calculated recipients - to=${to}, from=${from}, bcc=${bcc}`);
        console.log(`📧 EMAIL DEBUG [6]: Environment variables present: SUPPORT_FALLBACK_TO_EMAIL=${!!process.env.SUPPORT_FALLBACK_TO_EMAIL}, SUPPORT_FROM_EMAIL=${!!process.env.SUPPORT_FROM_EMAIL}, RESEND_API_KEY=${!!process.env.RESEND_API_KEY}`);

        if (!to) {
            console.error('📧 EMAIL DEBUG [7]: No email recipient configured');
            return { ok: false, error: 'no_recipient' };
        }

        if (!process.env.RESEND_API_KEY) {
            console.error('📧 EMAIL DEBUG [8]: Missing RESEND_API_KEY environment variable');
            return { ok: false, error: 'missing_api_key' };
        }

        console.log(`📧 EMAIL DEBUG [9]: All validation passed, preparing to send email`);

        try {
            // Initialize Resend only when needed at runtime
            console.log(`📧 EMAIL DEBUG [10]: Initializing Resend client`);
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Create email content
            console.log(`📧 EMAIL DEBUG [11]: Generating email subject and body`);
            const emailSubject = subject(ev);
            const emailBody = body(ev);

            console.log(`📧 EMAIL DEBUG [12]: Email subject: ${emailSubject}`);
            console.log(`📧 EMAIL DEBUG [13]: Email body: ${emailBody}`);

            // Send the email
            console.log(`📧 EMAIL DEBUG [14]: Sending email via Resend API`);
            const r = await resend.emails.send({
                to,
                bcc,
                from,
                subject: emailSubject,
                text: emailBody
            });

            console.log(`📧 EMAIL DEBUG [15]: Resend API response: ${JSON.stringify(r)}`);
            return { ok: true, id: (r as { id?: string }).id };
        } catch (e) {
            console.error(`📧 EMAIL DEBUG [16]: Email sending failed with error: ${e instanceof Error ? e.message : 'Unknown error'}`);
            console.error(`📧 EMAIL DEBUG [17]: Full error object:`, e);
            return { ok: false, error: (e as Error).message };
        }
    }
};

export default emailProvider;
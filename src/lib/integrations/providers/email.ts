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
    // Check if this is a feedback escalation
    const isFeedback = ev.reason.startsWith('feedback_');
    const feedbackMeta = ev.meta as {
        feedbackId?: string;
        feedbackType?: string;
        priority?: string;
        contactInfo?: string;
        url?: string;
        escalationReason?: string;
        browserInfo?: any;
    } | undefined;

    if (isFeedback && feedbackMeta) {
        // Format feedback escalation email
        const typeLabel = feedbackMeta.feedbackType?.replace('_', ' ').toUpperCase() || 'FEEDBACK';
        const priorityLabel = feedbackMeta.priority?.toUpperCase() || 'MEDIUM';
        
        const parts = [
            `NEW ${typeLabel} FEEDBACK - ${priorityLabel} PRIORITY`,
            '',
            `Title: ${ev.userMessage}`,
            '',
            `Description:`,
            ev.assistantAnswer || '—',
            '',
            `Feedback Details:`,
            `• Type: ${feedbackMeta.feedbackType?.replace('_', ' ') || 'General'}`,
            `• Priority: ${feedbackMeta.priority || 'medium'}`,
            `• Feedback ID: ${feedbackMeta.feedbackId}`,
        ];

        if (feedbackMeta.contactInfo) {
            parts.push(`• Contact: ${feedbackMeta.contactInfo}`);
        }

        if (feedbackMeta.url) {
            parts.push(`• Source URL: ${feedbackMeta.url}`);
        }

        if (feedbackMeta.browserInfo) {
            parts.push('', 'Technical Information:');
            if (feedbackMeta.browserInfo.userAgent) {
                parts.push(`• User Agent: ${feedbackMeta.browserInfo.userAgent}`);
            }
            if (feedbackMeta.browserInfo.language) {
                parts.push(`• Language: ${feedbackMeta.browserInfo.language}`);
            }
            if (feedbackMeta.browserInfo.platform) {
                parts.push(`• Platform: ${feedbackMeta.browserInfo.platform}`);
            }
        }

        parts.push('', `View in Dashboard: ${process.env.SITE_URL || 'http://localhost:3001'}/dashboard/feedback`);
        
        return parts.join('\n');
    }

    // Default escalation format for non-feedback escalations
    const reason = ev.reason || 'Unknown';
    const confidence = typeof ev.confidence === 'number' ? ev.confidence.toFixed(2) : 'n/a';
    const sessionId = ev.sessionId || 'Unknown';
    const conversationId = ev.conversationId || 'Unknown';
    const userMessage = ev.userMessage || 'No message available';
    const assistantAnswer = ev.assistantAnswer || '—';

    // Extract contact info from meta
    const contactInfo = ev.meta?.contactInfo as { name?: string; contact_method?: string; contact_value?: string } | undefined;
    const contactLines = contactInfo 
        ? [
            'Customer Contact Information:',
            `Name: ${contactInfo.name}`,
            `Preferred Contact Method: ${contactInfo.contact_method}`,
            `Contact Details: ${contactInfo.contact_value}`,
            ''
          ]
        : [];

    // Handle references (URLs)
    let refsText = '—';
    if (Array.isArray(ev.refs) && ev.refs.length > 0) {
        refsText = ev.refs.map((u, index) => {
            // Try to extract a meaningful title from the URL
            let linkText = u;
            try {
                const url = new URL(u);
                let path = url.pathname.replace(/\/$/, ''); // remove trailing slash
                if (path) {
                    linkText = path.split('/').pop()?.replace(/\.(html|php|asp|aspx)$/, '') || url.hostname;
                } else {
                    linkText = url.hostname;
                }
                // Make it more readable
                linkText = linkText.replace(/-/g, ' ').replace(/_/g, ' ');
                // Capitalize first letter
                linkText = linkText.charAt(0).toUpperCase() + linkText.slice(1);
                return `${index + 1}. ${linkText}: ${u}`;
            } catch (e) {
                return `${index + 1}. ${u}`;
            }
        }).join('\n');
    }

    // Build the email body
    return [
        `Reason: ${reason}`,
        `Confidence: ${confidence}`,
        `Session: ${sessionId}`,
        `Conversation: ${conversationId}`,
        '',
        ...contactLines,
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
        // Email provider processing escalation event (debug logs removed)

        // Get recipient from integration config or fallback to environment variable
        const to = (i.config?.to as string) || process.env.SUPPORT_FALLBACK_TO_EMAIL;
        const bcc = "bkorous@gmail.com"; // Hard-coded BCC for monitoring
        const from = (i.config?.from as string) || process.env.SUPPORT_FROM_EMAIL || 'support@contact.helpninja.app';

        // Recipient calculation (debug logs removed)

        if (!to) {
            console.error('📧 EMAIL DEBUG [7]: No email recipient configured');
            return { ok: false, error: 'no_recipient' };
        }

        if (!process.env.RESEND_API_KEY) {
            console.error('📧 EMAIL DEBUG [8]: Missing RESEND_API_KEY environment variable');
            return { ok: false, error: 'missing_api_key' };
        }

        // Validation passed

        try {
            // Initialize Resend only when needed at runtime
            // Initializing Resend client
            const resend = new Resend(process.env.RESEND_API_KEY);

            // Create email content
            // Generating email subject and body
            const emailSubject = subject(ev);
            const emailBody = body(ev);

            // Email subject/body prepared

            // Send the email
            // Sending email via Resend API
            const r = await resend.emails.send({
                to,
                bcc,
                from,
                subject: emailSubject,
                text: emailBody
            });

            // Resend API response received
            return { ok: true, id: (r as { id?: string }).id };
        } catch (e) {
            console.error(`📧 EMAIL DEBUG [16]: Email sending failed with error: ${e instanceof Error ? e.message : 'Unknown error'}`);
            console.error(`📧 EMAIL DEBUG [17]: Full error object:`, e);
            return { ok: false, error: (e as Error).message };
        }
    }
};

export default emailProvider;
import { Resend } from 'resend'
import { Provider, EscalationEvent, IntegrationRecord } from '../types'
import { buildEscalationEmail } from '@/lib/emails/templates/builders'

// Note: Subject and body generation functions have been moved to the template system
// in @/lib/emails/templates/builders.ts for better maintainability and HTML support

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

            // Create email content using new template system
            // Generating email subject, HTML, and text content
            const emailTemplate = buildEscalationEmail(ev);

            // Email content prepared

            // Send the email
            // Sending email via Resend API
            const r = await resend.emails.send({
                to,
                bcc,
                from,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
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
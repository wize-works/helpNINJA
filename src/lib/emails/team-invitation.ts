import { Resend } from 'resend';
import { buildTeamInvitationEmail } from './templates/builders';

export interface TeamInvitationEmailData {
    email: string;
    token: string;
    role: string;
    tenantName: string;
    invitedByName: string;
    message?: string;
    expiresAt: Date;
}

export async function sendTeamInvitationEmail(data: TeamInvitationEmailData): Promise<{ ok: boolean; id?: string; error?: string }> {
    const supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.app';

    try {
        // Generate email content using new template system
        const emailTemplate = buildTeamInvitationEmail(data);

        // Initialize Resend only when needed at runtime
        const resend = new Resend(process.env.RESEND_API_KEY!);
        const result = await resend.emails.send({
            from: supportEmail,
            to: data.email,
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html,
        });

        return { ok: true, id: result.data?.id };
    } catch (error) {
        console.error('Failed to send team invitation email:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

// Note: getRoleDescription function has been moved to the template builders
// for better code organization and reusability

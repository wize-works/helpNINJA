import { Resend } from 'resend';

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
    const {
        email,
        token,
        role,
        tenantName,
        invitedByName,
        message,
        expiresAt
    } = data;

    const invitationUrl = `${process.env.SITE_URL}/invite/${token}`;
    const supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.app';
    const expiryDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const subject = `You're invited to join ${tenantName} on helpNINJA`;

    const textContent = [
        `Hi there!`,
        ``,
        `${invitedByName} has invited you to join their team on helpNINJA as a ${role}.`,
        ``,
        `${tenantName} is using helpNINJA to provide AI-powered customer support with smart escalation and analytics.`,
        ``,
        message ? `Personal message from ${invitedByName}:` : '',
        message ? `"${message}"` : '',
        message ? `` : '',
        `To accept this invitation, click the link below:`,
        invitationUrl,
        ``,
        `This invitation will expire in ${expiryDays} day${expiryDays !== 1 ? 's' : ''} (${expiresAt.toLocaleDateString()}).`,
        ``,
        `About your role as ${role}:`,
        getRoleDescription(role),
        ``,
        `If you don't have a helpNINJA account yet, one will be created for you when you accept the invitation.`,
        ``,
        `Questions? Contact us at ${supportEmail}`,
        ``,
        `Best regards,`,
        `The helpNINJA Team`,
        ``,
        `---`,
        `If you weren't expecting this invitation, you can safely ignore this email.`
    ].filter(line => line !== undefined).join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation - ${tenantName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .content { padding: 30px 0; }
        .invitation-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .role-badge { display: inline-block; background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
        .message-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        .expiry-notice { background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 8px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">helpNINJA</div>
        </div>
        
        <div class="content">
            <h1>You're invited to join ${tenantName}!</h1>
            
            <p>Hi there!</p>
            
            <p><strong>${invitedByName}</strong> has invited you to join their team on helpNINJA as a <span class="role-badge">${role}</span>.</p>
            
            <div class="invitation-card">
                <h3>About ${tenantName}</h3>
                <p>${tenantName} is using helpNINJA to provide AI-powered customer support with smart escalation and analytics.</p>
                
                ${message ? `
                <div class="message-box">
                    <strong>Personal message from ${invitedByName}:</strong><br>
                    "${message}"
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="cta-button">Accept Invitation</a>
            </div>
            
            <div class="expiry-notice">
                ⏰ This invitation expires in ${expiryDays} day${expiryDays !== 1 ? 's' : ''} (${expiresAt.toLocaleDateString()})
            </div>
            
            <h3>Your role as ${role}:</h3>
            <p>${getRoleDescription(role)}</p>
            
            <p><small>If you don't have a helpNINJA account yet, one will be created for you when you accept the invitation.</small></p>
        </div>
        
        <div class="footer">
            <p>Questions? Reply to this email or contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`;

    try {
        // Initialize Resend only when needed at runtime
        const resend = new Resend(process.env.RESEND_API_KEY!);
        const result = await resend.emails.send({
            from: supportEmail,
            to: email,
            subject,
            text: textContent,
            html: htmlContent,
        });

        return { ok: true, id: result.data?.id };
    } catch (error) {
        console.error('Failed to send team invitation email:', error);
        return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

function getRoleDescription(role: string): string {
    const descriptions = {
        admin: 'Full access to manage team members, integrations, settings, and all dashboard features.',
        analyst: 'Access to analytics, conversations, and documents. Can view team and integration settings.',
        support: 'Access to conversations, escalations, and customer support features. Limited settings access.',
        viewer: 'Read-only access to dashboard analytics and conversation history. Cannot modify settings.',
    };

    return descriptions[role as keyof typeof descriptions] || 'Team member with access to dashboard features.';
}

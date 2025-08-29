/**
 * Notification email sender
 * Integrates with the notification system to send formatted emails
 */

import { Resend } from 'resend';
import { buildNotificationEmail, NotificationEmailData } from './templates/builders';

export interface NotificationEmailContext {
  tenantId: string;
  tenantName?: string;
  recipientEmail: string;
  recipientName?: string;
}

/**
 * Send notification email using the template system
 */
export async function sendNotificationEmail(
  data: NotificationEmailData,
  context: NotificationEmailContext
): Promise<{ ok: boolean; id?: string; error?: string }> {
  
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable');
    return { ok: false, error: 'missing_api_key' };
  }

  const supportEmail = process.env.SUPPORT_FROM_EMAIL || 'support@helpninja.app';

  try {
    // Generate email content using template system
    const emailTemplate = buildNotificationEmail({
      ...data,
      tenantName: context.tenantName,
      recipientName: context.recipientName
    });

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: supportEmail,
      to: context.recipientEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
    });

    return { ok: true, id: result.data?.id };
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Helper function to send notification emails for system events
 */
export async function sendSystemNotificationEmail(
  tenantId: string,
  recipients: Array<{ email: string; name?: string }>,
  notification: {
    type: string;
    severity: 'info' | 'success' | 'warning' | 'error' | 'critical';
    title: string;
    body?: string;
    meta?: Record<string, unknown>;
  },
  tenantName?: string
): Promise<Array<{ email: string; ok: boolean; id?: string; error?: string }>> {
  
  const results: Array<{ email: string; ok: boolean; id?: string; error?: string }> = [];

  for (const recipient of recipients) {
    const result = await sendNotificationEmail(
      {
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
        body: notification.body,
        meta: notification.meta,
        tenantName,
        recipientName: recipient.name
      },
      {
        tenantId,
        tenantName,
        recipientEmail: recipient.email,
        recipientName: recipient.name
      }
    );

    results.push({
      email: recipient.email,
      ...result
    });
  }

  return results;
}

/**
 * Common notification types with pre-configured templates
 */
export const NotificationTypes = {
  // Escalation notifications
  ESCALATION_TRIGGERED: 'escalation.triggered',
  
  // Content notifications  
  DOCUMENT_INGESTED: 'document.ingested',
  INGESTION_FAILED: 'ingestion.failed',
  
  // Integration notifications
  INTEGRATION_FAILED: 'integration.failed',
  INTEGRATION_RECOVERED: 'integration.recovered',
  OUTBOX_RETRY_EXHAUSTED: 'outbox.retry_exhausted',
  
  // Billing notifications
  TRIAL_EXPIRING: 'plan.trial_expiring',
  PAYMENT_FAILED: 'plan.payment_failed',
  PLAN_UPGRADED: 'plan.upgraded',
  PLAN_DOWNGRADED: 'plan.downgraded',
  
  // System notifications
  USAGE_THRESHOLD_80: 'usage.threshold_80',
  USAGE_THRESHOLD_100: 'usage.threshold_100',
  SITE_VERIFICATION_FAILED: 'site.verification_failed',
  SITE_VERIFICATION_SUCCESS: 'site.verification_success'
} as const;

/**
 * Helper functions for common notification scenarios
 */
export const NotificationHelpers = {
  /**
   * Send billing notification
   */
  async sendBillingNotification(
    tenantId: string,
    recipients: Array<{ email: string; name?: string }>,
    type: 'trial_expiring' | 'payment_failed' | 'plan_upgraded' | 'plan_downgraded',
    details: Record<string, unknown> = {},
    tenantName?: string
  ) {
    const titles = {
      trial_expiring: 'Your helpNINJA trial is expiring soon',
      payment_failed: 'Payment failed for your helpNINJA subscription',
      plan_upgraded: 'Your helpNINJA plan has been upgraded',
      plan_downgraded: 'Your helpNINJA plan has been changed'
    };

    const severities = {
      trial_expiring: 'warning' as const,
      payment_failed: 'error' as const,
      plan_upgraded: 'success' as const,
      plan_downgraded: 'info' as const
    };

    return sendSystemNotificationEmail(
      tenantId,
      recipients,
      {
        type: `plan.${type}`,
        severity: severities[type],
        title: titles[type],
        body: `Please check your account for more details.`,
        meta: {
          actionUrl: `${process.env.SITE_URL}/dashboard/billing`,
          actionText: 'Manage Billing',
          ...details
        }
      },
      tenantName
    );
  },

  /**
   * Send integration status notification
   */
  async sendIntegrationNotification(
    tenantId: string,
    recipients: Array<{ email: string; name?: string }>,
    type: 'failed' | 'recovered',
    integrationName: string,
    error?: string,
    tenantName?: string
  ) {
    const titles = {
      failed: `Integration "${integrationName}" has failed`,
      recovered: `Integration "${integrationName}" has recovered`
    };

    const severities = {
      failed: 'error' as const,
      recovered: 'success' as const
    };

    return sendSystemNotificationEmail(
      tenantId,
      recipients,
      {
        type: `integration.${type}`,
        severity: severities[type],
        title: titles[type],
        body: type === 'failed' 
          ? `The integration is experiencing issues and may not be functioning correctly.`
          : `The integration is now working normally again.`,
        meta: {
          integrationName,
          error,
          actionUrl: `${process.env.SITE_URL}/dashboard/integrations`,
          actionText: 'Manage Integrations'
        }
      },
      tenantName
    );
  },

  /**
   * Send usage threshold notification
   */
  async sendUsageNotification(
    tenantId: string,
    recipients: Array<{ email: string; name?: string }>,
    threshold: 80 | 100,
    usageDetails: { current: number; limit: number; period?: string },
    tenantName?: string
  ) {
    const isAtLimit = threshold === 100;
    const title = isAtLimit 
      ? 'Usage limit reached for your helpNINJA account'
      : 'Approaching usage limit for your helpNINJA account';

    return sendSystemNotificationEmail(
      tenantId,
      recipients,
      {
        type: `usage.threshold_${threshold}`,
        severity: isAtLimit ? 'critical' : 'warning',
        title,
        body: `You have used ${usageDetails.current} of ${usageDetails.limit} messages${usageDetails.period ? ` this ${usageDetails.period}` : ''}.`,
        meta: {
          usage: usageDetails,
          actionUrl: `${process.env.SITE_URL}/dashboard/billing`,
          actionText: isAtLimit ? 'Upgrade Plan' : 'View Usage'
        }
      },
      tenantName
    );
  }
};

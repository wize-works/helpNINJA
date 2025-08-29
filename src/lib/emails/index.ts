/**
 * helpNINJA Email System
 * 
 * A comprehensive email template system providing consistent branding
 * and modern design for all email communications.
 * 
 * Features:
 * - Responsive HTML templates with fallback text versions
 * - Consistent helpNINJA branding and design
 * - Support for various email types (invitations, escalations, notifications)
 * - Mobile-optimized layouts
 * - Dark mode friendly colors
 * - Accessibility considerations
 * 
 * Usage:
 * 
 * // Team invitations
 * import { sendTeamInvitationEmail } from '@/lib/emails/team-invitation';
 * 
 * // Escalations (automatically uses templates)
 * import emailProvider from '@/lib/integrations/providers/email';
 * 
 * // Notifications
 * import { sendNotificationEmail, NotificationHelpers } from '@/lib/emails/notification-sender';
 * 
 * // Custom templates
 * import { generateEmailTemplate, generateTextTemplate } from '@/lib/emails/templates/base';
 * import { buildTeamInvitationEmail, buildEscalationEmail } from '@/lib/emails/templates/builders';
 */

// Export main template functions
export {
  generateEmailTemplate,
  generateTextTemplate,
  type EmailTemplateData,
  type EmailColors
} from './templates/base';

// Export template builders
export {
  buildTeamInvitationEmail,
  buildEscalationEmail,
  buildNotificationEmail,
  type TeamInvitationData,
  type NotificationEmailData,
  type EmailResult
} from './templates/builders';

// Export notification sender
export {
  sendNotificationEmail,
  sendSystemNotificationEmail,
  NotificationTypes,
  NotificationHelpers,
  type NotificationEmailContext
} from './notification-sender';

// Export existing functions
export {
  sendTeamInvitationEmail,
  type TeamInvitationEmailData
} from './team-invitation';

/**
 * Quick start guide:
 * 
 * 1. Team Invitations:
 *    Use sendTeamInvitationEmail() - already integrated
 * 
 * 2. Escalation Emails:
 *    Automatically use new templates via the email integration provider
 * 
 * 3. Notification Emails:
 *    Use NotificationHelpers for common scenarios or sendNotificationEmail for custom
 * 
 * 4. Custom Templates:
 *    Use generateEmailTemplate() with your own EmailTemplateData
 * 
 * All emails are automatically branded with helpNINJA styling and include:
 * - Responsive design
 * - Consistent header/footer
 * - Proper fallback text versions
 * - Mobile optimization
 * - Accessibility features
 */

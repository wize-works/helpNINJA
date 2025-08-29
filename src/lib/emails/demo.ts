/**
 * Email Template Demonstrations
 * 
 * This file contains sample data and functions to generate example emails
 * for testing and preview purposes. Use this for development and testing.
 */

import { 
  buildTeamInvitationEmail,
  buildEscalationEmail,
  buildNotificationEmail,
  type TeamInvitationData,
  type NotificationEmailData
} from './templates/builders';
import { EscalationEvent } from '@/lib/integrations/types';

/**
 * Generate sample team invitation email
 */
export function generateSampleTeamInvitation(): { html: string; text: string; subject: string } {
  const sampleData: TeamInvitationData = {
    email: 'john.doe@company.com',
    token: 'inv_abc123def456',
    role: 'admin',
    tenantName: 'Acme Corporation',
    invitedByName: 'Sarah Wilson',
    message: 'Welcome to our customer support team! We\'re excited to have you help us provide exceptional service to our clients.',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  };

  return buildTeamInvitationEmail(sampleData);
}

/**
 * Generate sample escalation email
 */
export function generateSampleEscalation(): { html: string; text: string; subject: string } {
  const sampleEvent: EscalationEvent = {
    tenantId: 'tenant_sample_123',
    reason: 'low_confidence',
    confidence: 0.42,
    sessionId: 'ses_789xyz012',
    conversationId: 'conv_456abc789',
    userMessage: 'I\'ve been trying to reset my password for over an hour and nothing is working. Your system keeps saying my email doesn\'t exist even though I\'ve been a customer for 3 years. This is incredibly frustrating!',
    assistantAnswer: 'I understand your frustration with the password reset process. Let me help you resolve this issue. First, please make sure you\'re using the same email address that was originally used to create your account...',
    refs: [
      'https://help.acme.com/password-reset-guide',
      'https://help.acme.com/account-recovery',
      'https://help.acme.com/contact-support'
    ],
    meta: {
      contactInfo: {
        name: 'Robert Chen',
        contact_method: 'email',
        contact_value: 'robert.chen@email.com'
      }
    }
  };

  return buildEscalationEmail(sampleEvent);
}

/**
 * Generate sample feedback escalation email
 */
export function generateSampleFeedbackEscalation(): { html: string; text: string; subject: string } {
  const sampleEvent: EscalationEvent = {
    tenantId: 'tenant_sample_123',
    reason: 'feedback_bug',
    sessionId: 'ses_feedback_001',
    conversationId: 'conv_feedback_001',
    userMessage: 'Mobile app crashes when uploading images',
    assistantAnswer: 'The mobile app has a critical bug where it crashes whenever users try to upload images larger than 5MB. This happens on both iOS and Android devices. Steps to reproduce: 1) Open mobile app, 2) Navigate to upload section, 3) Select image larger than 5MB, 4) App crashes immediately.',
    meta: {
      feedbackId: 'fb_123456',
      feedbackType: 'bug_report',
      priority: 'high',
      contactInfo: 'mobile.tester@company.com',
      url: 'https://app.acme.com/upload',
      browserInfo: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        language: 'en-US',
        platform: 'iPhone'
      }
    }
  };

  return buildEscalationEmail(sampleEvent);
}

/**
 * Generate sample notification emails
 */
export function generateSampleNotifications(): Array<{ type: string; html: string; text: string; subject: string }> {
  const notifications: Array<{ type: string; data: NotificationEmailData }> = [
    {
      type: 'Trial Expiring',
      data: {
        type: 'plan.trial_expiring',
        severity: 'warning',
        title: 'Your helpNINJA trial expires in 3 days',
        body: 'Your 14-day trial will expire on December 15th. Upgrade now to continue using all helpNINJA features without interruption.',
        meta: {
          daysLeft: 3,
          actionUrl: 'https://app.helpninja.com/billing',
          actionText: 'Upgrade Now'
        },
        tenantName: 'Acme Corporation',
        recipientName: 'Sarah Wilson'
      }
    },
    {
      type: 'Integration Failed',
      data: {
        type: 'integration.failed',
        severity: 'error',
        title: 'Slack integration has stopped working',
        body: 'Your Slack integration encountered an error and is no longer receiving notifications. Please check your integration settings.',
        meta: {
          integrationName: 'Slack Notifications',
          error: 'Authentication token expired',
          actionUrl: 'https://app.helpninja.com/integrations',
          actionText: 'Fix Integration'
        },
        tenantName: 'Acme Corporation',
        recipientName: 'Sarah Wilson'
      }
    },
    {
      type: 'Usage Threshold',
      data: {
        type: 'usage.threshold_80',
        severity: 'warning',
        title: 'You\'re approaching your message limit',
        body: 'You\'ve used 800 of 1,000 messages this month. Consider upgrading your plan to avoid service interruption.',
        meta: {
          current: 800,
          limit: 1000,
          period: 'month',
          actionUrl: 'https://app.helpninja.com/billing',
          actionText: 'View Usage'
        },
        tenantName: 'Acme Corporation',
        recipientName: 'Sarah Wilson'
      }
    },
    {
      type: 'Document Ingested',
      data: {
        type: 'document.ingested',
        severity: 'success',
        title: 'Successfully processed your knowledge base',
        body: 'We\'ve finished processing 47 documents from your website. Your AI assistant now has access to the latest information.',
        meta: {
          documentsProcessed: 47,
          source: 'Website Crawl',
          actionUrl: 'https://app.helpninja.com/documents',
          actionText: 'View Documents'
        },
        tenantName: 'Acme Corporation',
        recipientName: 'Sarah Wilson'
      }
    }
  ];

  return notifications.map(({ type, data }) => ({
    type,
    ...buildNotificationEmail(data)
  }));
}

/**
 * Generate all sample emails for testing
 */
export function generateAllSamples() {
  return {
    teamInvitation: generateSampleTeamInvitation(),
    escalation: generateSampleEscalation(),
    feedbackEscalation: generateSampleFeedbackEscalation(),
    notifications: generateSampleNotifications()
  };
}

/**
 * Utility function to save sample emails to files (for development)
 */
export function saveSampleEmails() {
  const samples = generateAllSamples();
  
  // This would be used in a development script
  console.log('Sample emails generated:');
  console.log('- Team invitation');
  console.log('- Standard escalation');
  console.log('- Feedback escalation');
  console.log(`- ${samples.notifications.length} notification types`);
  
  return samples;
}

// Export sample data for use in tests or development tools
export const SAMPLE_DATA = {
  teamInvitation: {
    email: 'john.doe@company.com',
    token: 'inv_abc123def456',
    role: 'admin',
    tenantName: 'Acme Corporation',
    invitedByName: 'Sarah Wilson',
    message: 'Welcome to our customer support team!',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  escalation: {
    reason: 'low_confidence',
    confidence: 0.42,
    userMessage: 'I need help with my account',
    assistantAnswer: 'I\'d be happy to help you with your account...'
  },
  notification: {
    type: 'plan.trial_expiring',
    severity: 'warning' as const,
    title: 'Your trial is expiring soon',
    body: 'Upgrade to continue using helpNINJA'
  }
};

/**
 * Email template builders for specific email types
 * Each builder creates the appropriate template data for different email scenarios
 */

import { EmailTemplateData, generateEmailTemplate, generateTextTemplate } from './base';
import { EscalationEvent } from '@/lib/integrations/types';

export interface EmailResult {
  html: string;
  text: string;
  subject: string;
}

/**
 * Build team invitation email
 */
export interface TeamInvitationData {
  email: string;
  token: string;
  role: string;
  tenantName: string;
  invitedByName: string;
  message?: string;
  expiresAt: Date;
}

export function buildTeamInvitationEmail(data: TeamInvitationData): EmailResult {
  const { token, role, tenantName, invitedByName, message, expiresAt } = data;
  
  const invitationUrl = `${process.env.SITE_URL}/invite/${token}`;
  const expiryDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const subject = `You're invited to join ${tenantName} on helpNINJA`;
  
  const bodyParts = [
    `<strong>${invitedByName}</strong> has invited you to join their team on helpNINJA as a <span class="badge">${role}</span>.`,
    
    `<div class="content-card">
      <h3 class="mt-0 mb-2">About ${tenantName}</h3>
      <p>${tenantName} is using helpNINJA to provide AI-powered customer support with smart escalation and analytics.</p>
      
      ${message ? `
      <div class="alert-card">
        <strong>Personal message from ${invitedByName}:</strong><br>
        "${message}"
      </div>
      ` : ''}
    </div>`,
    
    `<div class="error-card">
      <strong>⏰ Important:</strong> This invitation expires in ${expiryDays} day${expiryDays !== 1 ? 's' : ''} (${expiresAt.toLocaleDateString()})
    </div>`,
    
    `<h3>Your role as ${role}:</h3>
    <p>${getRoleDescription(role)}</p>`,
    
    `<p class="text-sm"><em>If you don't have a helpNINJA account yet, one will be created for you when you accept the invitation.</em></p>`
  ];

  const templateData: EmailTemplateData = {
    title: `You're invited to join ${tenantName}!`,
    preheader: `${invitedByName} has invited you to join their team on helpNINJA`,
    body: bodyParts.join('\n'),
    callToAction: {
      text: 'Accept Invitation',
      url: invitationUrl,
      style: 'primary'
    },
    tenantName,
    footerText: "If you weren't expecting this invitation, you can safely ignore this email."
  };

  return {
    html: generateEmailTemplate(templateData),
    text: generateTextTemplate(templateData),
    subject
  };
}

/**
 * Build escalation notification email
 */
export function buildEscalationEmail(ev: EscalationEvent): EmailResult {
  // Check if this is a feedback escalation
  const isFeedback = ev.reason.startsWith('feedback_');
  const feedbackMeta = ev.meta as FeedbackEscalationMeta | undefined;

  if (isFeedback && feedbackMeta) {
    return buildFeedbackEscalationEmail(ev, feedbackMeta);
  }

  return buildStandardEscalationEmail(ev);
}

/**
 * Build feedback escalation email
 */
interface FeedbackEscalationMeta {
  feedbackId?: string;
  feedbackType?: string;
  priority?: string;
  contactInfo?: string;
  url?: string;
  escalationReason?: string;
  browserInfo?: Record<string, unknown>;
}

function buildFeedbackEscalationEmail(ev: EscalationEvent, feedbackMeta: FeedbackEscalationMeta): EmailResult {
  const typeLabel = feedbackMeta.feedbackType?.replace('_', ' ').toUpperCase() || 'FEEDBACK';
  const priorityLabel = feedbackMeta.priority?.toUpperCase() || 'MEDIUM';
  
  const subject = `helpNINJA Feedback: ${typeLabel} - ${priorityLabel} Priority`;
  
  const badgeClass = priorityLabel === 'HIGH' ? 'badge-error' : 
                    priorityLabel === 'MEDIUM' ? 'badge-warning' : 'badge';
  
  const bodyParts = [
    `<div class="content-card">
      <div class="mb-2">
        <span class="badge ${badgeClass}">${priorityLabel} PRIORITY</span>
        <span class="badge ml-2">${typeLabel}</span>
      </div>
      
      <h3 class="mt-2 mb-2">Feedback Details</h3>
      <p><strong>Title:</strong> ${ev.userMessage}</p>
      
      ${ev.assistantAnswer ? `
      <p><strong>Description:</strong></p>
      <div class="content-card" style="background-color: #f1f5f9; margin: 8px 0;">
        ${ev.assistantAnswer}
      </div>
      ` : ''}
      
      <div class="mt-3">
        <p><strong>Feedback Information:</strong></p>
        <ul>
          <li>Type: ${feedbackMeta.feedbackType?.replace('_', ' ') || 'General'}</li>
          <li>Priority: ${feedbackMeta.priority || 'medium'}</li>
          <li>Feedback ID: ${feedbackMeta.feedbackId}</li>
          ${feedbackMeta.contactInfo ? `<li>Contact: ${feedbackMeta.contactInfo}</li>` : ''}
          ${feedbackMeta.url ? `<li>Source URL: <a href="${feedbackMeta.url}">${feedbackMeta.url}</a></li>` : ''}
        </ul>
      </div>
      
      ${feedbackMeta.browserInfo ? `
      <div class="mt-3">
        <p><strong>Technical Information:</strong></p>
        <ul>
          ${feedbackMeta.browserInfo.userAgent ? `<li>User Agent: ${feedbackMeta.browserInfo.userAgent}</li>` : ''}
          ${feedbackMeta.browserInfo.language ? `<li>Language: ${feedbackMeta.browserInfo.language}</li>` : ''}
          ${feedbackMeta.browserInfo.platform ? `<li>Platform: ${feedbackMeta.browserInfo.platform}</li>` : ''}
        </ul>
      </div>
      ` : ''}
    </div>`
  ];

  const templateData: EmailTemplateData = {
    title: `New ${typeLabel} Feedback`,
    preheader: `${priorityLabel} priority feedback: ${ev.userMessage}`,
    body: bodyParts.join('\n'),
    callToAction: {
      text: 'View in Dashboard',
      url: `${process.env.SITE_URL || 'http://localhost:3001'}/dashboard/feedback`,
      style: 'primary'
    },
    footerText: 'This is an automated notification from your helpNINJA feedback system.'
  };

  return {
    html: generateEmailTemplate(templateData),
    text: generateTextTemplate(templateData),
    subject
  };
}

/**
 * Build standard escalation email
 */
function buildStandardEscalationEmail(ev: EscalationEvent): EmailResult {
  const reason = ev.reason || 'Unknown';
  const confidence = typeof ev.confidence === 'number' ? ev.confidence.toFixed(2) : 'n/a';
  const sessionId = ev.sessionId || 'Unknown';
  const conversationId = ev.conversationId || 'Unknown';
  const shortId = typeof sessionId === 'string' ? sessionId.slice(0, 6) : 'Unknown';
  
  const subject = `helpNINJA Escalation — ${reason} — ${shortId}`;
  
  // Extract contact info
  const contactInfo = ev.meta?.contactInfo as { 
    name?: string; 
    contact_method?: string; 
    contact_value?: string; 
  } | undefined;
  
  // Format references
  let referencesHtml = '<p><em>No references available</em></p>';
  if (Array.isArray(ev.refs) && ev.refs.length > 0) {
    const refLinks = ev.refs.map((url) => {
      let linkText = url;
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname.replace(/\/$/, '');
        if (path) {
          linkText = path.split('/').pop()?.replace(/\.(html|php|asp|aspx)$/, '') || urlObj.hostname;
        } else {
          linkText = urlObj.hostname;
        }
        linkText = linkText.replace(/-/g, ' ').replace(/_/g, ' ');
        linkText = linkText.charAt(0).toUpperCase() + linkText.slice(1);
        return `<li><a href="${url}">${linkText}</a></li>`;
      } catch {
        return `<li><a href="${url}">${url}</a></li>`;
      }
    }).join('\n');
    referencesHtml = `<ul>${refLinks}</ul>`;
  }

  const bodyParts = [
    `<div class="alert-card">
      <strong>Escalation Details</strong><br>
      Reason: ${reason} | Confidence: ${confidence} | Session: ${sessionId}
    </div>`,
    
    contactInfo ? `
    <div class="content-card">
      <h3 class="mt-0 mb-2">Customer Contact Information</h3>
      <p><strong>Name:</strong> ${contactInfo.name || 'Not provided'}</p>
      <p><strong>Preferred Contact Method:</strong> ${contactInfo.contact_method || 'Not specified'}</p>
      <p><strong>Contact Details:</strong> ${contactInfo.contact_value || 'Not provided'}</p>
    </div>
    ` : '',
    
    `<div class="content-card">
      <h3 class="mt-0 mb-2">User Message</h3>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
        ${ev.userMessage || 'No message available'}
      </div>
    </div>`,
    
    `<div class="content-card">
      <h3 class="mt-0 mb-2">Assistant Response</h3>
      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px;">
        ${ev.assistantAnswer || '—'}
      </div>
    </div>`,
    
    `<div class="content-card">
      <h3 class="mt-0 mb-2">Reference Documents</h3>
      ${referencesHtml}
    </div>`
  ].filter(Boolean);

  const templateData: EmailTemplateData = {
    title: 'Customer Support Escalation',
    preheader: `${reason} escalation for conversation ${shortId}`,
    body: bodyParts.join('\n'),
    callToAction: {
      text: 'View Conversation',
      url: `${process.env.SITE_URL || 'http://localhost:3001'}/dashboard/conversations/${conversationId}`,
      style: 'primary'
    },
    footerText: 'This is an automated escalation from your helpNINJA chat system.'
  };

  return {
    html: generateEmailTemplate(templateData),
    text: generateTextTemplate(templateData),
    subject
  };
}

/**
 * Build notification email
 */
export interface NotificationEmailData {
  type: string;
  severity: 'info' | 'success' | 'warning' | 'error' | 'critical';
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
  tenantName?: string;
  recipientName?: string;
}

export function buildNotificationEmail(data: NotificationEmailData): EmailResult {
  const { severity, title, body, meta, tenantName, recipientName } = data;
  
  const subject = `helpNINJA ${severity === 'critical' ? 'URGENT' : ''} Notification: ${title}`;
  
  // Choose card style based on severity
  const cardClass = severity === 'success' ? 'success-card' :
                   severity === 'warning' ? 'alert-card' :
                   severity === 'error' || severity === 'critical' ? 'error-card' :
                   'content-card';
  
  const severityIcon = severity === 'success' ? '✅' :
                      severity === 'warning' ? '⚠️' :
                      severity === 'error' || severity === 'critical' ? '🚨' :
                      'ℹ️';
  
  const bodyParts = [
    `<div class="${cardClass}">
      <h3 class="mt-0 mb-2">${severityIcon} ${title}</h3>
      ${body ? `<p>${body}</p>` : ''}
      
      ${meta?.details ? `
      <div class="mt-3">
        <p><strong>Details:</strong></p>
        <div style="background-color: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">
          ${typeof meta.details === 'string' ? meta.details : JSON.stringify(meta.details, null, 2)}
        </div>
      </div>
      ` : ''}
    </div>`,
    
    `<p>This notification was generated for ${tenantName ? `${tenantName}` : 'your helpNINJA account'} at ${new Date().toLocaleString()}.</p>`
  ];

  const templateData: EmailTemplateData = {
    title: `${severity.charAt(0).toUpperCase() + severity.slice(1)} Notification`,
    preheader: title,
    greeting: recipientName ? `Hi ${recipientName},` : undefined,
    body: bodyParts.join('\n'),
    callToAction: meta?.actionUrl ? {
      text: (meta.actionText as string) || 'View Dashboard',
      url: meta.actionUrl as string,
      style: severity === 'critical' || severity === 'error' ? 'primary' : 'secondary'
    } : {
      text: 'Open Dashboard',
      url: `${process.env.SITE_URL || 'http://localhost:3001'}/dashboard`,
      style: 'secondary'
    },
    tenantName,
    footerText: 'You can manage your notification preferences in your account settings.'
  };

  return {
    html: generateEmailTemplate(templateData),
    text: generateTextTemplate(templateData),
    subject
  };
}

/**
 * Get role description for team invitations
 */
function getRoleDescription(role: string): string {
  const descriptions = {
    admin: 'Full access to manage team members, integrations, settings, and all dashboard features.',
    analyst: 'Access to analytics, conversations, and documents. Can view team and integration settings.',
    support: 'Access to conversations, escalations, and customer support features. Limited settings access.',
    viewer: 'Read-only access to dashboard analytics and conversation history. Cannot modify settings.',
  };

  return descriptions[role as keyof typeof descriptions] || 'Team member with access to dashboard features.';
}

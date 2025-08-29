import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function text(ev: EscalationEvent) {
    // Check if this is a feedback escalation
    const isFeedback = ev.reason.startsWith('feedback_');
    const feedbackMeta = ev.meta as {
        feedbackId?: string;
        feedbackType?: string;
        priority?: string;
        contactInfo?: string;
        url?: string;
        escalationReason?: string;
    } | undefined;

    if (isFeedback && feedbackMeta) {
        // Format feedback escalation message
        const typeEmoji = feedbackMeta.feedbackType === 'bug' ? '🐛' : 
                         feedbackMeta.feedbackType === 'feature_request' ? '💡' : 
                         feedbackMeta.feedbackType === 'improvement' ? '⚡' : 
                         feedbackMeta.feedbackType === 'ui_ux' ? '🎨' : 
                         feedbackMeta.feedbackType === 'performance' ? '⚡' : '📝';
        
        const priorityEmoji = feedbackMeta.priority === 'urgent' ? '🚨' : 
                             feedbackMeta.priority === 'high' ? '⚠️' : 
                             feedbackMeta.priority === 'medium' ? '📋' : '📌';

        let message = `${typeEmoji} *New ${feedbackMeta.feedbackType?.replace('_', ' ').toUpperCase()} Feedback* ${priorityEmoji}\n\n`;
        message += `*Title:* ${ev.userMessage}\n\n`;
        message += `*Description:*\n${ev.assistantAnswer || '—'}\n\n`;
        
        if (feedbackMeta.contactInfo) {
            message += `*Contact:* ${feedbackMeta.contactInfo}\n`;
        }
        
        if (feedbackMeta.url) {
            message += `*Source:* <${feedbackMeta.url}|${feedbackMeta.url}>\n`;
        }
        
        message += `*Priority:* ${feedbackMeta.priority}\n`;
        message += `*Feedback ID:* ${feedbackMeta.feedbackId}\n\n`;
        message += `<${process.env.SITE_URL}/dashboard/feedback|View in Dashboard>`;
        
        return message;
    }

    // Default escalation format for non-feedback escalations
    const refs = (ev.refs || []).map(u => {
        // Try to extract a meaningful title from the URL
        let linkText = 'ref';
        try {
            const url = new URL(u);
            // Remove common extensions and clean up the path
            const path = url.pathname.replace(/\/$/, ''); // remove trailing slash
            if (path) {
                linkText = path.split('/').pop()?.replace(/\.(html|php|asp|aspx)$/, '') || url.hostname;
            } else {
                linkText = url.hostname;
            }
            // Make it more readable
            linkText = linkText.replace(/-/g, ' ').replace(/_/g, ' ');
            // Capitalize first letter
            linkText = linkText.charAt(0).toUpperCase() + linkText.slice(1);
        } catch {
            // If URL parsing fails, just show the full URL as link text
            linkText = u.length > 50 ? u.substring(0, 47) + '...' : u;
        }
        return `• <${u}|${linkText}>`;
    }).join('\n')
    
    // Extract contact info from meta for non-feedback escalations
    const contactInfo = ev.meta?.contactInfo as { name?: string; contact_method?: string; contact_value?: string } | undefined;
    const contactText = contactInfo 
        ? `*Contact:* ${contactInfo.name} (${contactInfo.contact_method}: ${contactInfo.contact_value})`
        : '';
    
    return `*Reason:* ${ev.reason}
*Confidence:* ${ev.confidence ?? 'n/a'}
*Session:* ${ev.sessionId}
*User:* ${ev.userMessage}
*Answer:* ${ev.assistantAnswer || '—'}
${contactText}
${refs ? `*Refs:*\n${refs}` : ''}
<${process.env.SITE_URL}/conversations/${ev.conversationId}|Open in dashboard>`
}

const slackProvider: Provider = {
    key: 'slack',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        console.log('🔍 Slack provider received integration record', {
            integrationId: i.id,
            provider: i.provider,
            name: i.name,
            credentialsType: typeof i.credentials,
            credentialsKeys: Object.keys(i.credentials || {}),
            credentialsStructure: i.credentials,
            hasWebhookUrl: !!(i.config as { webhook_url?: string })?.webhook_url,
            webhookUrlPreview: (i.config as { webhook_url?: string })?.webhook_url ? 
                String((i.config as { webhook_url?: string }).webhook_url).substring(0, 50) + '...' : 'none'
        });
        
        const webhook = (i.config?.webhook_url as string) || process.env.SLACK_WEBHOOK_URL
        if (!webhook) {
            console.error('❌ Slack escalation failed: No webhook URL configured', { 
                integrationId: i.id, 
                hasCredentials: !!i.credentials,
                credentialsKeys: Object.keys(i.credentials || {}),
                hasEnvWebhook: !!process.env.SLACK_WEBHOOK_URL 
            });
            return { ok: false, error: 'no slack webhook configured' }
        }
        
        const payload = { text: 'helpNINJA escalation', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: text(ev) } }] }
        
        try {
            console.log('🔄 Sending Slack escalation', { 
                integrationId: i.id, 
                conversationId: ev.conversationId,
                webhook: webhook.substring(0, 50) + '...' // Log partial webhook for debugging
            });
            
            const res = await fetch(webhook, { 
                method: 'POST', 
                headers: { 'content-type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if (!res.ok) {
                const responseText = await res.text().catch(() => 'Unable to read response');
                console.error('❌ Slack webhook returned error', { 
                    status: res.status, 
                    statusText: res.statusText,
                    response: responseText,
                    integrationId: i.id 
                });
                return { ok: false, error: `HTTP ${res.status}: ${res.statusText} - ${responseText}` }
            }
            
            console.log('✅ Slack escalation sent successfully', { integrationId: i.id, conversationId: ev.conversationId });
            return { ok: true }
        } catch (e) { 
            console.error('❌ Slack escalation network error', { 
                error: (e as Error).message,
                integrationId: i.id,
                conversationId: ev.conversationId
            });
            return { ok: false, error: (e as Error).message } 
        }
    }
}
export default slackProvider

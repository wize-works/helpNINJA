import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function formatZoomMessage(ev: EscalationEvent) {
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
        // Format feedback escalation message with rich formatting
        const typeEmoji = feedbackMeta.feedbackType === 'bug' ? '🐛' :
            feedbackMeta.feedbackType === 'feature_request' ? '💡' :
                feedbackMeta.feedbackType === 'improvement' ? '⚡' :
                    feedbackMeta.feedbackType === 'ui_ux' ? '🎨' :
                        feedbackMeta.feedbackType === 'performance' ? '⚡' : '📝';

        const priorityEmoji = feedbackMeta.priority === 'urgent' ? '🚨' :
            feedbackMeta.priority === 'high' ? '⚠️' :
                feedbackMeta.priority === 'medium' ? '📋' : '📌';

        return {
            head: {
                text: `${typeEmoji} New ${feedbackMeta.feedbackType?.replace('_', ' ').toUpperCase()} Feedback ${priorityEmoji}`,
                style: {
                    color: feedbackMeta.priority === 'urgent' ? '#FF6B35' :
                        feedbackMeta.priority === 'high' ? '#FF8C42' : '#2B59C3',
                    bold: true
                }
            },
            body: [
                {
                    type: "section",
                    sidebar_color: feedbackMeta.priority === 'urgent' ? '#FF6B35' : '#2B59C3',
                    sections: [
                        {
                            type: "message",
                            text: `**Title:** ${ev.userMessage}`
                        },
                        {
                            type: "message",
                            text: `**Description:**\n${ev.assistantAnswer || '—'}`
                        },
                        ...(feedbackMeta.contactInfo ? [{
                            type: "message",
                            text: `**Contact:** ${feedbackMeta.contactInfo}`
                        }] : []),
                        ...(feedbackMeta.url ? [{
                            type: "message",
                            text: `**Source:** ${feedbackMeta.url}`
                        }] : []),
                        {
                            type: "message",
                            text: `**Priority:** ${feedbackMeta.priority}`
                        },
                        {
                            type: "message",
                            text: `**Feedback ID:** ${feedbackMeta.feedbackId}`
                        },
                        {
                            type: "message",
                            text: `[View in Dashboard](${process.env.SITE_URL}/dashboard/feedback)`
                        }
                    ]
                }
            ]
        };
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
        return `• [${linkText}](${u})`;
    }).join('\n')

    // Extract contact info from meta for non-feedback escalations
    const contactInfo = ev.meta?.contactInfo as { name?: string; contact_method?: string; contact_value?: string } | undefined;
    const contactText = contactInfo
        ? `**Contact:** ${contactInfo.name} (${contactInfo.contact_method}: ${contactInfo.contact_value})`
        : '';

    // Color based on escalation reason and confidence
    const getEscalationColor = () => {
        if (ev.reason === 'user_request') return '#FF6B35'; // Orange for user requests
        if (ev.reason === 'low_confidence') return '#FFB84D'; // Yellow for low confidence
        if (ev.reason === 'handoff') return '#E74C3C'; // Red for handoffs
        return '#2B59C3'; // Default blue
    };

    return {
        head: {
            text: "🚨 helpNINJA Escalation Alert",
            style: {
                color: getEscalationColor(),
                bold: true
            }
        },
        body: [
            {
                type: "section",
                sidebar_color: getEscalationColor(),
                sections: [
                    {
                        type: "message",
                        text: `**Reason:** ${ev.reason}`
                    },
                    {
                        type: "message",
                        text: `**Confidence:** ${ev.confidence ?? 'n/a'}`
                    },
                    {
                        type: "message",
                        text: `**Session:** ${ev.sessionId}`
                    },
                    {
                        type: "message",
                        text: `**User:** ${ev.userMessage}`
                    },
                    {
                        type: "message",
                        text: `**Answer:** ${ev.assistantAnswer || '—'}`
                    },
                    ...(contactText ? [{
                        type: "message",
                        text: contactText
                    }] : []),
                    ...(refs ? [{
                        type: "message",
                        text: `**Refs:**\n${refs}`
                    }] : []),
                    {
                        type: "message",
                        text: `[Open in dashboard](${process.env.SITE_URL}/conversations/${ev.conversationId})`
                    }
                ]
            }
        ]
    };
}

const zoomProvider: Provider = {
    key: 'zoom',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        console.log('🔍 Zoom provider received integration record', {
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

        const webhook = (i.config?.webhook_url as string) || process.env.ZOOM_WEBHOOK_URL
        if (!webhook) {
            console.error('❌ Zoom escalation failed: No webhook URL configured', {
                integrationId: i.id,
                hasCredentials: !!i.credentials,
                credentialsKeys: Object.keys(i.credentials || {}),
                hasEnvWebhook: !!process.env.ZOOM_WEBHOOK_URL
            });
            return { ok: false, error: 'no zoom webhook configured' }
        }

        // Format message content
        const messageContent = formatZoomMessage(ev);

        // Zoom Chat webhook payload format
        const payload = {
            robot: {
                account_id: process.env.ZOOM_ACCOUNT_ID || "default",
                content: messageContent,
                to_jid: (i.config?.channel_id as string) || "channel",
                user_jid: (i.config?.bot_name as string) || "helpNINJA Bot"
            }
        };

        try {
            console.log('🔄 Sending Zoom escalation', {
                integrationId: i.id,
                conversationId: ev.conversationId,
                webhook: webhook.substring(0, 50) + '...' // Log partial webhook for debugging
            });

            const res = await fetch(webhook, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': `Bearer ${process.env.ZOOM_BOT_TOKEN || ''}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const responseText = await res.text().catch(() => 'Unable to read response');
                console.error('❌ Zoom webhook returned error', {
                    status: res.status,
                    statusText: res.statusText,
                    response: responseText,
                    integrationId: i.id
                });
                return { ok: false, error: `HTTP ${res.status}: ${res.statusText} - ${responseText}` }
            }

            console.log('✅ Zoom escalation sent successfully', { integrationId: i.id, conversationId: ev.conversationId });
            return { ok: true }
        } catch (e) {
            console.error('❌ Zoom escalation network error', {
                error: (e as Error).message,
                integrationId: i.id,
                conversationId: ev.conversationId
            });
            return { ok: false, error: (e as Error).message }
        }
    }
}

export default zoomProvider
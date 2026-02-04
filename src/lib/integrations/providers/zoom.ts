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
        // Format feedback escalation message for Zoom's fields format
        const typeEmoji = feedbackMeta.feedbackType === 'bug' ? '🐛' :
            feedbackMeta.feedbackType === 'feature_request' ? '💡' :
                feedbackMeta.feedbackType === 'improvement' ? '⚡' :
                    feedbackMeta.feedbackType === 'ui_ux' ? '🎨' :
                        feedbackMeta.feedbackType === 'performance' ? '⚡' : '📝';

        const priorityEmoji = feedbackMeta.priority === 'urgent' ? '🚨' :
            feedbackMeta.priority === 'high' ? '⚠️' :
                feedbackMeta.priority === 'medium' ? '📋' : '📌';

        return {
            "📝 Type": `${typeEmoji} ${feedbackMeta.feedbackType?.replace('_', ' ').toUpperCase() || 'Feedback'}`,
            "📌 Priority": `${priorityEmoji} ${feedbackMeta.priority?.toUpperCase() || 'MEDIUM'}`,
            "💬 Title": ev.userMessage,
            "📋 Description": ev.assistantAnswer || '—',
            ...(feedbackMeta.contactInfo ? { "👤 Contact": feedbackMeta.contactInfo } : {}),
            ...(feedbackMeta.url ? { "🔗 Source": feedbackMeta.url } : {}),
            "🔢 Feedback ID": feedbackMeta.feedbackId || 'N/A',
            "📊 Dashboard": `${process.env.SITE_URL}/dashboard/feedback`
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
        return `${linkText}: ${u}`;
    }).join('\n')

    // Extract contact info from meta for non-feedback escalations
    const contactInfo = ev.meta?.contactInfo as { name?: string; contact_method?: string; contact_value?: string } | undefined;
    const contactText = contactInfo
        ? `${contactInfo.name} (${contactInfo.contact_method}: ${contactInfo.contact_value})`
        : '';

    return {
        "🚨 Alert": "helpNINJA Escalation",
        "📋 Reason": ev.reason,
        "🎯 Confidence": String(ev.confidence ?? 'n/a'),
        "🔢 Session": ev.sessionId,
        "👤 User": ev.userMessage,
        "🤖 Answer": ev.assistantAnswer || '—',
        ...(contactText ? { "📞 Contact": contactText } : {}),
        ...(refs ? { "📚 References": refs } : {}),
        "📊 Dashboard": `${process.env.SITE_URL}/conversations/${ev.conversationId}`
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
            hasVerificationToken: !!(i.credentials as { verification_token?: string })?.verification_token,
            webhookUrlPreview: (i.config as { webhook_url?: string })?.webhook_url ?
                String((i.config as { webhook_url?: string }).webhook_url).substring(0, 50) + '...' : 'none'
        });

        const webhookUrl = (i.config?.webhook_url as string) || process.env.ZOOM_WEBHOOK_URL
        const verificationToken = (i.credentials?.verification_token as string) || process.env.ZOOM_VERIFICATION_TOKEN

        if (!webhookUrl) {
            console.error('❌ Zoom escalation failed: No webhook URL configured', {
                integrationId: i.id,
                hasCredentials: !!i.credentials,
                credentialsKeys: Object.keys(i.credentials || {}),
                hasEnvWebhook: !!process.env.ZOOM_WEBHOOK_URL
            });
            return { ok: false, error: 'no zoom webhook URL configured' }
        }

        if (!verificationToken) {
            console.error('❌ Zoom escalation failed: No verification token configured', {
                integrationId: i.id,
                hasCredentials: !!i.credentials,
                hasEnvToken: !!process.env.ZOOM_VERIFICATION_TOKEN
            });
            return { ok: false, error: 'no zoom verification token configured' }
        }

        // Format message content for Zoom's fields format
        const messageFields = formatZoomMessage(ev);

        // Add required timestamp for Zoom webhook validation
        const payload = {
            ...messageFields,
            timestamp: Math.floor(Date.now() / 1000) // Unix timestamp in seconds
        };

        // Construct webhook URL with fields format parameter
        const webhookUrlWithFormat = `${webhookUrl}?format=fields`;

        try {
            console.log('🔄 Sending Zoom escalation', {
                integrationId: i.id,
                conversationId: ev.conversationId,
                webhook: webhookUrl.substring(0, 50) + '...',
                format: 'fields',
                timestamp: payload.timestamp
            });

            const res = await fetch(webhookUrlWithFormat, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'Authorization': verificationToken // Zoom uses direct token, not Bearer
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
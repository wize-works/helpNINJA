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
        "❓ User Question": ev.userMessage,
        "🤖 AI Response": ev.assistantAnswer || '—',
        ...(contactText ? { "📞 Contact": contactText } : {}),
        ...(refs ? { "📚 References": refs } : {}),
        "📊 Dashboard": `${process.env.SITE_URL}/conversations/${ev.conversationId}`
    };
}

const zoomProvider: Provider = {
    key: 'zoom',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {

        const webhookUrl = (i.config?.webhook_url as string) || process.env.ZOOM_WEBHOOK_URL
        const verificationToken = (i.credentials?.verification_token as string) || process.env.ZOOM_VERIFICATION_TOKEN

        if (!webhookUrl) {
            return { ok: false, error: 'no zoom webhook URL configured' }
        }

        if (!verificationToken) {
            return { ok: false, error: 'no zoom verification token configured' }
        }

        // Format message content for Zoom's fields format
        const messageFields = formatZoomMessage(ev);

        // Generate timestamp for Zoom webhook validation (required as query param)
        const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

        // Construct webhook URL with format and timestamp parameters
        const webhookUrlWithParams = `${webhookUrl}?format=fields&timestamp=${timestamp}`;

        try {

            const res = await fetch(webhookUrlWithParams, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${verificationToken}` // Try Bearer format
                },
                body: JSON.stringify(messageFields)
            });

            if (!res.ok) {
                const responseText = await res.text().catch(() => 'Unable to read response');
                return { ok: false, error: `HTTP ${res.status}: ${res.statusText} - ${responseText}` }
            }

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
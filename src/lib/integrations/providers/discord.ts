import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function formatDiscordMessage(ev: EscalationEvent) {
    // Format refs with better link text - extract meaningful text from URL or show the URL
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
    
    // Extract contact info from meta
    const contactInfo = ev.meta?.contactInfo as { name?: string; contact_method?: string; contact_value?: string } | undefined;
    
    // Build embed fields array
    const fields = [
        {
            name: "🔍 Escalation Reason",
            value: ev.reason,
            inline: true
        },
        {
            name: "📊 Confidence Score",
            value: ev.confidence ? `${Math.round(ev.confidence * 100)}%` : 'n/a',
            inline: true
        },
        {
            name: "🔗 Session ID",
            value: `\`${ev.sessionId}\``,
            inline: true
        },
        {
            name: "💬 User Message",
            value: ev.userMessage.length > 1024 ? ev.userMessage.substring(0, 1021) + '...' : ev.userMessage,
            inline: false
        }
    ];

    // Add AI response if available
    if (ev.assistantAnswer) {
        fields.push({
            name: "🤖 AI Response",
            value: ev.assistantAnswer.length > 1024 ? ev.assistantAnswer.substring(0, 1021) + '...' : ev.assistantAnswer,
            inline: false
        });
    }

    // Add contact info if available
    if (contactInfo) {
        fields.push({
            name: "👤 Customer Contact",
            value: `**${contactInfo.name}**\n${contactInfo.contact_method}: ${contactInfo.contact_value}`,
            inline: false
        });
    }

    // Add references if available
    if (refs) {
        fields.push({
            name: "📚 References",
            value: refs.length > 1024 ? refs.substring(0, 1021) + '...' : refs,
            inline: false
        });
    }

    return fields;
}

function getEscalationColor(reason: string, confidence?: number): number {
    // Discord colors in decimal format
    switch (reason) {
        case 'low_confidence':
            return 0xF59E0B; // Amber
        case 'restricted':
            return 0xDC2626; // Red
        case 'handoff':
            return 0x3B82F6; // Blue
        case 'user_request':
            return 0x10B981; // Green
        case 'fallback_error':
            return 0x7C2D12; // Dark red
        default:
            if (confidence !== undefined && confidence < 0.3) {
                return 0xDC2626; // Red for very low confidence
            }
            return 0x6366F1; // Indigo (default)
    }
}

const discordProvider: Provider = {
    key: 'discord',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        console.log('🔍 Discord provider received integration record', {
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
        
        const webhook = (i.config?.webhook_url as string) || process.env.DISCORD_WEBHOOK_URL
        if (!webhook) {
            console.error('❌ Discord escalation failed: No webhook URL configured', { 
                integrationId: i.id, 
                hasCredentials: !!i.credentials,
                credentialsKeys: Object.keys(i.credentials || {}),
                hasEnvWebhook: !!process.env.DISCORD_WEBHOOK_URL 
            });
            return { ok: false, error: 'no discord webhook configured' }
        }
        
        // Discord webhook payload with rich embed
        const payload = {
            username: (i.config?.username as string) || 'helpNINJA Bot',
            avatar_url: `${process.env.SITE_URL}/logo.svg`,
            embeds: [{
                title: "🚨 helpNINJA Escalation Alert",
                description: `A conversation requires human attention and has been escalated from your AI assistant.`,
                color: getEscalationColor(ev.reason, ev.confidence),
                fields: formatDiscordMessage(ev),
                footer: {
                    text: "helpNINJA Customer Support",
                    icon_url: `${process.env.SITE_URL}/logo.svg`
                },
                timestamp: new Date().toISOString(),
                url: `${process.env.SITE_URL}/conversations/${ev.conversationId}`
            }]
        }
        
        try {
            console.log('🔄 Sending Discord escalation', { 
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
                console.error('❌ Discord webhook returned error', { 
                    status: res.status, 
                    statusText: res.statusText,
                    response: responseText,
                    integrationId: i.id 
                });
                return { ok: false, error: `HTTP ${res.status}: ${res.statusText} - ${responseText}` }
            }
            
            console.log('✅ Discord escalation sent successfully', { integrationId: i.id, conversationId: ev.conversationId });
            return { ok: true }
        } catch (e) { 
            console.error('❌ Discord escalation network error', { 
                error: (e as Error).message,
                integrationId: i.id,
                conversationId: ev.conversationId
            });
            return { ok: false, error: (e as Error).message } 
        }
    }
}

export default discordProvider

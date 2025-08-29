import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function formatMessage(ev: EscalationEvent) {
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
    }).join('\n\n')
    
    // Extract contact info from meta
    const contactInfo = ev.meta?.contactInfo as { name?: string; contact_method?: string; contact_value?: string } | undefined;
    const contactText = contactInfo 
        ? `**Contact:** ${contactInfo.name} (${contactInfo.contact_method}: ${contactInfo.contact_value})\n\n`
        : '';
    
    // Format message for Adaptive Cards (supports markdown)
    const parts = [
        `**Reason:** ${ev.reason}`,
        `**Confidence:** ${ev.confidence ?? 'n/a'}`,
        `**User Message:** ${ev.userMessage}`,
        `**AI Response:** ${ev.assistantAnswer || '—'}`,
    ];
    
    if (contactText) {
        parts.push(contactText.trim());
    }
    
    if (refs) {
        parts.push(`**References:**\n\n${refs}`);
    }
    
    return parts.join('\n\n');
}

const teamsProvider: Provider = {
    key: 'teams',
    async sendEscalation(ev: EscalationEvent, i: IntegrationRecord) {
        console.log('🔍 Teams provider received integration record', {
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
        
        const webhook = (i.config?.webhook_url as string) || process.env.TEAMS_WEBHOOK_URL
        if (!webhook) {
            console.error('❌ Teams escalation failed: No webhook URL configured', { 
                integrationId: i.id, 
                hasCredentials: !!i.credentials,
                credentialsKeys: Object.keys(i.credentials || {}),
                hasEnvWebhook: !!process.env.TEAMS_WEBHOOK_URL 
            });
            return { ok: false, error: 'no teams webhook configured' }
        }
        
        // Microsoft Teams webhook payload format (Adaptive Card)
        const payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.2",
                        "body": [
                            {
                                "type": "ColumnSet",
                                "columns": [
                                    {
                                        "type": "Column",
                                        "width": "auto",
                                        "items": [
                                            {
                                                "type": "Image",
                                                "url": `${process.env.SITE_URL}/logo.svg`,
                                                "size": "Small",
                                                "style": "Person"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "Column",
                                        "width": "stretch",
                                        "items": [
                                            {
                                                "type": "TextBlock",
                                                "text": "helpNINJA Escalation",
                                                "weight": "Bolder",
                                                "size": "Medium"
                                            },
                                            {
                                                "type": "TextBlock",
                                                "text": `Session: ${ev.sessionId}`,
                                                "spacing": "None",
                                                "isSubtle": true
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "type": "TextBlock",
                                "text": formatMessage(ev),
                                "wrap": true,
                                "spacing": "Medium"
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": "Open in Dashboard",
                                "url": `${process.env.SITE_URL}/conversations/${ev.conversationId}`
                            }
                        ]
                    }
                }
            ]
        }
        
        try {
            console.log('🔄 Sending Teams escalation', { 
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
                console.error('❌ Teams webhook returned error', { 
                    status: res.status, 
                    statusText: res.statusText,
                    response: responseText,
                    integrationId: i.id 
                });
                return { ok: false, error: `HTTP ${res.status}: ${res.statusText} - ${responseText}` }
            }
            
            console.log('✅ Teams escalation sent successfully', { integrationId: i.id, conversationId: ev.conversationId });
            return { ok: true }
        } catch (e) { 
            console.error('❌ Teams escalation network error', { 
                error: (e as Error).message,
                integrationId: i.id,
                conversationId: ev.conversationId
            });
            return { ok: false, error: (e as Error).message } 
        }
    }
}

export default teamsProvider

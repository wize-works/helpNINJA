import { Provider, EscalationEvent, IntegrationRecord } from '../types'

function text(ev: EscalationEvent) {
    const refs = (ev.refs || []).map(u => `• <${u}|ref>`).join('\n')
    return `*Reason:* ${ev.reason}
*Confidence:* ${ev.confidence ?? 'n/a'}
*Session:* ${ev.sessionId}
*User:* ${ev.userMessage}
*Answer:* ${ev.assistantAnswer || '—'}
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
            hasWebhookUrl: !!(i.config as any)?.webhook_url,
            webhookUrlPreview: (i.config as any)?.webhook_url ? 
                String((i.config as any).webhook_url).substring(0, 50) + '...' : 'none'
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

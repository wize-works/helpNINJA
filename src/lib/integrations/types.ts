export type ProviderKey = 'email' | 'slack' | 'teams' | 'freshdesk' | 'zoho' | 'zendesk' | 'cherwell' | 'jira'
export type EscalationReason = 'low_confidence' | 'restricted' | 'handoff' | 'user_request' | 'fallback_error'
export type EscalationEvent = {
    tenantId: string
    conversationId: string
    sessionId: string
    userMessage: string
    assistantAnswer?: string
    confidence?: number
    refs?: string[]
    reason: EscalationReason
    ruleId?: string
    fromWebhook?: boolean
    fromChat?: boolean
    integrationId?: string
    skipWebhooks?: boolean // Add flag to prevent duplicate webhook triggers
    meta?: Record<string, unknown>
    data?: {
        reason?: string;
        confidence?: number;
        triggered_at?: string;
        conversation_id?: string;
        session_id?: string;
        user_message?: string;
        assistant_answer?: string;
    };
    destinations?: Array<
        { integrationId: string } |
        { directEmail: string; provider: string } |
        { destination: { type: string; email?: string; integration_id?: string } }
    >;
}
export type IntegrationRecord = {
    id: string
    tenant_id: string
    provider: ProviderKey
    name: string
    status: 'active' | 'disabled'
    credentials: Record<string, unknown>
    config: Record<string, unknown>
}
export interface Provider {
    key: ProviderKey
    supportsTickets?: boolean
    sendEscalation: (ev: EscalationEvent, i: IntegrationRecord) => Promise<{ ok: boolean; id?: string; url?: string; error?: string }>
}

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
    meta?: Record<string, unknown>
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

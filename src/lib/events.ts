import { query } from '@/lib/db';

// Central list of supported event names (extend cautiously to preserve analytics consistency)
export type EventName =
    | 'conversation_started'
    | 'message_sent'
    | 'escalation_triggered'
    | 'checkout_completed'
    | 'plan_updated'
    | 'ingest_started'
    
    | 'ingest_completed'
    | 'ingest_failed'
    | 'integration_failed'
    | 'integration_succeeded'
    | 'quota_exceeded'
    | 'feedback_submitted'
    | 'feedback_updated'
    | 'feedback_deleted'
    | 'feedback_escalated'
    | 'feedback_comment_added'
    | 'feedback_escalation_failed';

const ALLOWED: Set<string> = new Set([
    'conversation_started',
    'message_sent',
    'escalation_triggered',
    'checkout_completed',
    'plan_updated',
    'ingest_started',
    'ingest_completed',
    'ingest_failed',
    'integration_failed',
    'integration_succeeded',
    'quota_exceeded',
    'feedback_submitted',
    'feedback_updated',
    'feedback_deleted',
    'feedback_escalated',
    'feedback_comment_added',
    'feedback_escalation_failed'
]);

export interface LogEventOptions<T = Record<string, unknown>> {
    tenantId: string;
    name: EventName; // restricted for consistent metrics
    data?: T;
    // If true, silently ignore invalid names instead of throwing (useful for optional events)
    soft?: boolean;
}

/**
 * Inserts a structured analytics/audit event. Keeps logic centralized for payload hygiene.
 * - Strips undefined values
 * - Caps payload size (JSON string length)
 */
export async function logEvent(opts: LogEventOptions): Promise<void> {
    const { tenantId, name, data, soft } = opts;
    if (!tenantId) return; // safety
    if (!ALLOWED.has(name)) {
        if (soft) return; // ignore silently
        throw new Error(`Unsupported event name: ${name}`);
    }
    let clean: Record<string, unknown> | null = null;
    if (data && typeof data === 'object') {
        clean = {};
        for (const [k, v] of Object.entries(data)) {
            if (v !== undefined) clean[k] = v;
        }
        try {
            const serialized = JSON.stringify(clean);
            if (serialized.length > 2000) {
                // truncate oversize payloads
                clean = { truncated: true };
            }
        } catch {
            clean = { invalid: true };
        }
    }
    try {
        await query(
            'insert into public.events (tenant_id, name, data) values ($1,$2,$3)',
            [tenantId, name, clean]
        );
    } catch (e) {
        // Non-critical; log but don\'t throw
        console.error('Failed to log event', name, e);
    }
}

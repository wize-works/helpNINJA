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

export interface Event {
    id: number;
    tenant_id: string;
    name: EventName;
    data: Record<string, unknown> | null;
    created_at: string;
}

interface LoadEventsOptions {
    search?: string;
    event?: string;
    dateRange?: string;
    limit?: number;
}

/**
 * Load events for a tenant with optional filtering
 */
export async function loadEvents(
    tenantId: string,
    options: LoadEventsOptions = {}
): Promise<Event[]> {
    const { search, event, dateRange, limit = 200 } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const params: (string | number)[] = [tenantId];
    let paramIndex = 2;

    // Filter by event type
    if (event) {
        whereClause += ` AND name = $${paramIndex}`;
        params.push(event);
        paramIndex++;
    }

    // Filter by date range
    if (dateRange) {
        let interval = '';
        switch (dateRange) {
            case '1h':
                interval = '1 hour';
                break;
            case '24h':
                interval = '1 day';
                break;
            case '7d':
                interval = '7 days';
                break;
            case '30d':
                interval = '30 days';
                break;
        }
        if (interval) {
            whereClause += ` AND created_at >= NOW() - INTERVAL '${interval}'`;
        }
    }

    // Search in event name or data (JSON text search)
    if (search && search.trim()) {
        whereClause += ` AND (
            name ILIKE $${paramIndex} OR 
            data::text ILIKE $${paramIndex}
        )`;
        params.push(`%${search.trim()}%`);
        paramIndex++;
    }

    const sql = `
        SELECT id, tenant_id, name, data, created_at
        FROM public.events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex}
    `;
    params.push(limit);

    try {
        const result = await query(sql, params);
        return result.rows as Event[];
    } catch (error) {
        console.error('Failed to load events:', error);
        throw error;
    }
}

import { query } from '@/lib/db';
import { auth, currentUser } from '@clerk/nextjs/server';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface CreateNotificationInput {
    tenantId: string;
    type: string;
    severity?: NotificationSeverity;
    title: string;
    body?: string;
    meta?: Record<string, unknown>;
    source?: string; // system | rule | escalation | billing
    eventKey?: string | null;
    groupKey?: string | null;
    dedupeWindowSecs?: number; // if set & eventKey present, suppress if identical within window
    broadcast?: boolean; // default true: notify all current members
    userIds?: string[]; // targeted list overrides broadcast
}

export interface NotificationRecord {
    id: string;
    type: string;
    severity: string;
    title: string;
    body: string | null;
    created_at: string;
    meta: Record<string, unknown>;
    read_at?: string | null;
}

/**
 * Create a notification (with optional dedupe) and insert recipient rows.
 */
export async function createNotification(input: CreateNotificationInput): Promise<{ id: string; created: boolean; suppressed?: boolean; } | null> {
    const {
        tenantId, type, severity = 'info', title, body = null, meta = {}, source = 'system', eventKey = null, groupKey = null,
        dedupeWindowSecs = 0, broadcast = true, userIds
    } = input;

    // Dedupe check
    if (eventKey && dedupeWindowSecs > 0) {
        const { rows: existing } = await query<{ id: string }>(
            `SELECT id FROM public.notifications
       WHERE tenant_id = $1 AND event_key = $2 AND created_at > now() - ($3 || ' seconds')::interval
       ORDER BY created_at DESC LIMIT 1`,
            [tenantId, eventKey, dedupeWindowSecs]
        );
        if (existing.length) {
            return { id: existing[0].id, created: false, suppressed: true };
        }
    }

    const { rows } = await query<{ id: string }>(
        `INSERT INTO public.notifications (tenant_id, type, severity, title, body, meta, source, event_key, group_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
        [tenantId, type, severity, title, body, meta, source, eventKey, groupKey]
    );
    const notificationId = rows[0].id;

    // Determine recipients
    let recipients: string[] = [];
    if (userIds && userIds.length > 0) {
        recipients = userIds;
    } else if (broadcast) {
        const { rows: members } = await query<{ user_id: string }>(
            `SELECT tm.user_id FROM public.tenant_members tm
       JOIN public.users u ON u.id = tm.user_id
       WHERE tm.tenant_id = $1 AND tm.status = 'active'`,
            [tenantId]
        );
        recipients = members.map(m => m.user_id).filter(Boolean);
    }

    if (recipients.length) {
        // Batch insert
        const values: string[] = [];
        const params: unknown[] = [];
        let idx = 1;
        for (const uid of recipients) {
            values.push(`($${idx++}, $${idx++})`);
            params.push(notificationId, uid);
        }
        await query(`INSERT INTO public.notification_recipients (notification_id, user_id) VALUES ${values.join(',')}
                 ON CONFLICT DO NOTHING`, params);
    }

    return { id: notificationId, created: true };
}

export async function listNotifications(tenantId: string, userId: string, limit = 20, cursor?: string) {
    const params: unknown[] = [tenantId, userId];
    let whereCursor = '';
    if (cursor) {
        params.push(cursor);
        whereCursor = `AND n.created_at < $${params.length}`;
    }
    params.push(limit + 1);
    const { rows } = await query<NotificationRecord & { next_cursor?: string }>(
        `SELECT n.id, n.type, n.severity, n.title, n.body, n.meta, n.created_at, nr.read_at
     FROM public.notifications n
     LEFT JOIN public.notification_recipients nr ON nr.notification_id = n.id AND nr.user_id = $2
     WHERE n.tenant_id = $1
       AND (nr.user_id = $2 OR NOT EXISTS (
            SELECT 1 FROM public.notification_recipients r2 WHERE r2.notification_id = n.id))
       ${whereCursor}
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT $${params.length}`,
        params
    );
    let nextCursor: string | null = null;
    if (rows.length > limit) {
        const last = rows[limit - 1];
        nextCursor = last.created_at;
        rows.splice(limit); // trim extra
    }
    return { notifications: rows, nextCursor };
}

export async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*)::int AS count
                 FROM public.notifications n
                 LEFT JOIN public.notification_recipients nr ON nr.notification_id = n.id AND nr.user_id = $2
                 WHERE n.tenant_id = $1
                     AND (
                         (nr.user_id IS NOT NULL AND nr.read_at IS NULL) -- targeted unread for this user
                         OR (
                                -- broadcast notification (no recipients at all)
                                NOT EXISTS (SELECT 1 FROM public.notification_recipients r3 WHERE r3.notification_id = n.id)
                         )
                     )`,
        [tenantId, userId]
    );
    return parseInt(rows[0]?.count || '0', 10);
}

export async function markNotificationRead(tenantId: string, notificationId: string, userId: string) {
    // Ensure the notification belongs to tenant
    const { rows: owned } = await query<{ tenant_id: string }>('SELECT tenant_id FROM public.notifications WHERE id=$1', [notificationId]);
    if (!owned.length || owned[0].tenant_id !== tenantId) throw new Error('not_found');

    // Upsert recipient row if broadcast & none exists
    await query(
        `INSERT INTO public.notification_recipients (notification_id, user_id, read_at)
     VALUES ($1,$2, now())
     ON CONFLICT (notification_id, user_id) DO UPDATE SET read_at = EXCLUDED.read_at`,
        [notificationId, userId]
    );
    return { ok: true };
}

export async function markAllRead(tenantId: string, userId: string) {
    // Insert missing recipient rows for broadcast notifications then mark all
    await query(
        `WITH broadcast AS (
        SELECT n.id FROM public.notifications n
        WHERE n.tenant_id = $1
          AND NOT EXISTS (SELECT 1 FROM public.notification_recipients r WHERE r.notification_id = n.id AND r.user_id = $2)
      )
      INSERT INTO public.notification_recipients (notification_id, user_id, read_at)
      SELECT id, $2, now() FROM broadcast
      ON CONFLICT DO NOTHING`,
        [tenantId, userId]
    );
    await query(
        `UPDATE public.notification_recipients SET read_at = now()
     WHERE user_id = $2 AND notification_id IN (SELECT id FROM public.notifications WHERE tenant_id = $1)`,
        [tenantId, userId]
    );
    return { ok: true };
}

export async function getPreferences(tenantId: string, userId: string) {
    const { rows } = await query(
        `SELECT channel, type, enabled, throttle_window_secs FROM public.notification_preferences
     WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
    );
    return rows;
}

export async function upsertPreferences(tenantId: string, userId: string, prefs: Array<{ channel: string; type: string; enabled: boolean; throttle_window_secs?: number; }>) {
    if (!Array.isArray(prefs)) return { ok: false, error: 'invalid_prefs' };
    for (const p of prefs) {
        await query(
            `INSERT INTO public.notification_preferences (tenant_id, user_id, channel, type, enabled, throttle_window_secs)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, user_id, channel, type)
       DO UPDATE SET enabled = EXCLUDED.enabled, throttle_window_secs = EXCLUDED.throttle_window_secs, updated_at = now()`,
            [tenantId, userId, p.channel, p.type, p.enabled, p.throttle_window_secs || 0]
        );
    }
    return { ok: true };
}

// Helper for internal service key auth when creating notifications via internal endpoint
export function assertInternalServiceKey(req: Request) {
    const headerKey = req.headers.get('x-internal-key');
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!expected || headerKey !== expected) throw new Error('unauthorized');
}

// Convenience for routes needing userId & tenantId in server context
/**
 * Resolve authenticated internal user UUID + tenant UUID.
 * Clerk provides an external userId (string, e.g. "user_abc123") which we map to internal users.id (uuid)
 * via the users.clerk_user_id column (added in migration 058). If the mapping row does not yet exist
 * (e.g. user logged in before webhook fired) we lazily insert it using current Clerk profile data.
 */
export async function resolveUserAndTenant(): Promise<{ userId: string; tenantId: string; }> {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) throw new Error('unauthenticated');

    // 1. Map Clerk user -> internal uuid
    let internalUserId: string | undefined;
    try {
        const { rows } = await query<{ id: string }>(
            'SELECT id FROM public.users WHERE clerk_user_id = $1',
            [clerkUserId]
        );
        internalUserId = rows[0]?.id;
    } catch (err) {
        console.error('User lookup failed:', err);
    }

    if (!internalUserId) {
        // Lazy create (best-effort) using current Clerk user data. This is safe: webhook will upsert later.
        try {
            const cu = await currentUser();
            const email = (cu?.primaryEmailAddress?.emailAddress || cu?.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@placeholder.local`).toLowerCase();
            const first = cu?.firstName || null;
            const last = cu?.lastName || null;
            const avatar = cu?.imageUrl || null;

            // Try to insert/update by clerk_user_id first
            const insert = await query<{ id: string }>(
                `insert into public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
                 values (gen_random_uuid(), $1,$2,$3,$4,$5)
                 on conflict (clerk_user_id) do update
                 set email = excluded.email,
                     first_name = excluded.first_name,
                     last_name = excluded.last_name,
                     avatar_url = excluded.avatar_url,
                     updated_at = now()
                 returning id`,
                [email, first, last, avatar, clerkUserId]
            );
            internalUserId = insert.rows[0]?.id;
        } catch (insertErr: unknown) {
            // If we get a duplicate email error, try to update the existing user with this clerk_user_id
            const err = insertErr as { code?: string; constraint?: string };
            if (err?.code === '23505' && err?.constraint === 'users_email_key') {
                console.log('User email already exists, updating clerk_user_id mapping');
                try {
                    const cu = await currentUser();
                    const email = (cu?.primaryEmailAddress?.emailAddress || cu?.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@placeholder.local`).toLowerCase();
                    const first = cu?.firstName || null;
                    const last = cu?.lastName || null;
                    const avatar = cu?.imageUrl || null;

                    const updateResult = await query<{ id: string }>(
                        `update public.users 
                         set clerk_user_id = $1, first_name = $2, last_name = $3, avatar_url = $4, updated_at = now()
                         where email = $5
                         returning id`,
                        [clerkUserId, first, last, avatar, email]
                    );
                    internalUserId = updateResult.rows[0]?.id;
                } catch (updateErr) {
                    console.error('Failed to update existing user with clerk_user_id:', updateErr);
                    throw new Error('user_mapping_failed');
                }
            } else {
                console.error('Lazy user insert failed:', insertErr);
                throw new Error('user_mapping_failed');
            }
        }
    }

    if (!internalUserId) throw new Error('user_not_found');

    // 2. Resolve tenant strictly (org required)
    const { getTenantIdStrict } = await import('@/lib/tenant-resolve');
    const tenantId = await getTenantIdStrict();
    // 3. Ensure membership exists (idempotent) so user receives broadcast notifications
    try {
        await query(
            `INSERT INTO public.tenant_members (tenant_id, user_id, role, status, joined_at)
             VALUES ($1,$2,'viewer','active', now())
             ON CONFLICT (tenant_id, user_id) DO NOTHING`,
            [tenantId, internalUserId]
        );
    } catch (e) {
        console.error('Failed ensuring tenant membership for notifications', e);
    }
    return { userId: internalUserId, tenantId };
}

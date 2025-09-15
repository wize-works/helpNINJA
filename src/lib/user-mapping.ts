import { query } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

/**
 * Resolve Clerk user ID to internal UUID
 * This function maps external Clerk user IDs to internal database UUIDs
 */
export async function resolveClerkUserId(clerkUserId: string): Promise<string | null> {
    // 1. Try to find existing mapping
    try {
        const { rows } = await query<{ id: string }>(
            'SELECT id FROM public.users WHERE clerk_user_id = $1',
            [clerkUserId]
        );
        if (rows[0]?.id) {
            return rows[0].id;
        }
    } catch (err) {
        console.error('User lookup failed:', err);
    }

    // 2. If no mapping exists, try to create one (lazy creation)
    try {
        const cu = await currentUser();
        const email = (cu?.primaryEmailAddress?.emailAddress || cu?.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@placeholder.local`).toLowerCase();
        const first = cu?.firstName || null;
        const last = cu?.lastName || null;
        const avatar = cu?.imageUrl || null;

        const insert = await query<{ id: string }>(
            `INSERT INTO public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
             ON CONFLICT (clerk_user_id) DO UPDATE
             SET email = excluded.email,
                 first_name = excluded.first_name,
                 last_name = excluded.last_name,
                 avatar_url = excluded.avatar_url,
                 updated_at = now()
             RETURNING id`,
            [email, first, last, avatar, clerkUserId]
        );

        return insert.rows[0]?.id || null;
    } catch (err) {
        console.error('Lazy user insert failed:', err);
        return null;
    }
}

/**
 * Resolve current authenticated user's Clerk ID to internal UUID
 */
export async function resolveCurrentUserId(clerkUserId: string): Promise<string> {
    const internalUserId = await resolveClerkUserId(clerkUserId);
    if (!internalUserId) {
        throw new Error('user_mapping_failed');
    }
    return internalUserId;
}
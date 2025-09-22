import { query } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

/**
 * Update user activity timestamp for tenant member
 * This should be called on any meaningful user interaction with the platform
 */
export async function updateUserActivity(userId?: string, tenantId?: string): Promise<void> {
    try {
        // If parameters not provided, resolve from current context
        let resolvedUserId = userId;
        let resolvedTenantId = tenantId;

        if (!resolvedUserId || !resolvedTenantId) {
            const { userId: clerkUserId } = await auth();
            if (!clerkUserId) return; // Not authenticated, skip

            // Get internal user ID from Clerk user ID
            if (!resolvedUserId) {
                const userResult = await query<{ id: string }>(
                    'SELECT id FROM public.users WHERE clerk_user_id = $1',
                    [clerkUserId]
                );
                if (!userResult.rows[0]?.id) return; // User not found, skip
                resolvedUserId = userResult.rows[0].id;
            }

            // Get tenant ID if not provided
            if (!resolvedTenantId) {
                try {
                    resolvedTenantId = await getTenantIdStrict();
                } catch {
                    return; // No valid tenant context, skip
                }
            }
        }

        // Call the existing database function
        await query(
            'SELECT update_user_activity($1, $2)',
            [resolvedUserId, resolvedTenantId]
        );
    } catch (error) {
        // Log error but don't throw - activity tracking shouldn't break the main flow
        console.error('Failed to update user activity:', error);
    }
}

/**
 * Middleware-style wrapper for API routes that automatically tracks user activity
 * Usage: export const GET = withActivityTracking(yourHandler);
 */
export function withActivityTracking<T extends (...args: unknown[]) => unknown>(
    handler: T
): T {
    return (async (...args: unknown[]) => {
        // Track activity before handling the request
        await updateUserActivity();

        // Call the original handler
        return handler(...args);
    }) as T;
}

/**
 * Simple helper to track activity in existing route handlers
 * Usage: await trackActivity(); at the start of authenticated routes
 */
export async function trackActivity(): Promise<void> {
    await updateUserActivity();
}
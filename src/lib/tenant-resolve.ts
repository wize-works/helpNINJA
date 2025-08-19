import { auth } from '@clerk/nextjs/server'
import { getTenantIdServer } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * Resolve tenantId for dashboard/server usage with additional fallbacks:
 * 1) Existing resolution (search params, headers, cookies, optional env)
 * 2) Clerk active organization → map to tenants.clerk_org_id
 * 3) Env fallback if allowed
 * Optionally persists the resolved tenantId in the `hn_tenant` cookie.
 */
export async function getTenantIdOrResolve(opts: { allowEnvFallback?: boolean } = {}): Promise<string> {
    // Try the standard resolution first
    try {
        const id = await getTenantIdServer({ allowEnvFallback: opts.allowEnvFallback })
        return id
    } catch {
        // fall through to Clerk-based fallback
    }

    // Try resolving via Clerk active organization
    try {
        const { orgId } = await auth()
        if (orgId) {
            const { rows } = await query<{ id: string }>(
                'SELECT id FROM public.tenants WHERE clerk_org_id = $1',
                [orgId]
            )
            const tenantId = rows[0]?.id
            if (tenantId) return tenantId
        }
    } catch (err) {
        // ignore and continue to env fallback
        console.error('Clerk org -> tenant fallback failed:', err)
    }

    // No env fallback in strict mode; maintain compatibility only when explicitly allowed in caller
    if (opts.allowEnvFallback) {
        const envTenant = process.env.DEMO_TENANT_ID || process.env.NEXT_PUBLIC_DEMO_TENANT_ID || ''
        if (envTenant) return envTenant
    }
    throw new Error('tenantId not resolved')
}

// Route handlers can import this to set the cookie legally if desired.
export function buildTenantCookie(): { name: string; value: string; options: { path: string; sameSite: 'lax'; httpOnly: boolean; secure: boolean; maxAge: number } } {
    return {
        name: 'hn_tenant',
        value: '', // caller must set value
        options: {
            path: '/',
            sameSite: 'lax' as const,
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365,
        },
    }
}

/**
 * Strict server-side tenant resolver for dashboard/admin APIs.
 * - Requires authenticated Clerk user and active organization
 * - Maps Clerk org -> tenants.id
 * - No env/search/header/cookie fallbacks
 */
export async function getTenantIdStrict(): Promise<string> {
    const { userId, orgId } = await auth()
    if (!userId) throw new Error('unauthenticated')
    if (!orgId) throw new Error('no active organization')

    const { rows } = await query<{ id: string }>(
        'SELECT id FROM public.tenants WHERE clerk_org_id = $1',
        [orgId]
    )
    const tenantId = rows[0]?.id
    if (!tenantId) throw new Error('tenant not found for active org')
    return tenantId
}

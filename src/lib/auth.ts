import { headers, cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined> | undefined
type HeadersLike = { get(name: string): string | null }
type CookiesLike = { get(name: string): { value: string } | undefined }

function pickFromSearchParams(sp: SearchParamsLike): string | null {
    if (!sp) return null
    if (sp instanceof URLSearchParams) return sp.get('tenantId') || sp.get('tenant')
    const record = sp as Record<string, string | string[] | undefined>
    const raw = record.tenantId ?? record.tenant
    if (Array.isArray(raw)) return raw[0] || null
    return (raw as string | undefined) || null
}

function pickFromHeaders(h: HeadersLike): string | null {
    return h.get('x-tenant-id') || h.get('x-tenant') || h.get('x-hn-tenant') || null
}

function pickFromCookieJar(jar: CookiesLike): string | null {
    return jar.get('hn_tenant')?.value || jar.get('tenantId')?.value || null
}

export type TenantResolveOptions = {
    searchParams?: SearchParamsLike
    allowEnvFallback?: boolean
}

/**
 * Resolve tenantId on the server using (in order):
 * - explicit searchParams (tenantId|tenant)
 * - request headers (x-tenant-id|x-tenant|x-hn-tenant)
 * - cookies (hn_tenant|tenantId)
 * - env fallback (DEMO_TENANT_ID|NEXT_PUBLIC_DEMO_TENANT_ID) if allowed
 */
export async function getTenantIdServer(opts: TenantResolveOptions = {}): Promise<string> {
    const h = await headers()
    const c = await cookies()
    const fromSp = pickFromSearchParams(opts.searchParams)
    const fromH = pickFromHeaders(h)
    const fromC = pickFromCookieJar(c)
    const fromEnv = opts.allowEnvFallback ? (process.env.DEMO_TENANT_ID || process.env.NEXT_PUBLIC_DEMO_TENANT_ID || '') : ''
    const val = fromSp || fromH || fromC || fromEnv
    if (!val) throw new Error('tenantId not resolved')
    return val
}

/**
 * Resolve tenantId from a NextRequest (API routes). Checks JSON body, query, headers, cookies.
 */
export async function resolveTenantIdFromRequest(req: NextRequest, allowEnvFallback = false): Promise<string> {
    // Try body (POST/PUT) without consuming for webhook routes that need raw body elsewhere
    let bodyTid: string | null = null
    try {
        if (req.method !== 'GET' && req.headers.get('content-type')?.includes('application/json')) {
            const j = await req.json()
            bodyTid = j?.tenantId || j?.tenant || null
        }
    } catch { }
    const url = new URL(req.url)
    const fromSp = url.searchParams.get('tenantId') || url.searchParams.get('tenant')
    const fromH = pickFromHeaders(req.headers as unknown as HeadersLike)
    const fromCookie = req.cookies.get('hn_tenant')?.value || req.cookies.get('tenantId')?.value || null
    const fromEnv = allowEnvFallback ? (process.env.DEMO_TENANT_ID || process.env.NEXT_PUBLIC_DEMO_TENANT_ID || '') : ''
    const val = bodyTid || fromSp || fromH || fromCookie || fromEnv
    if (!val) throw new Error('tenantId not resolved')
    return val
}

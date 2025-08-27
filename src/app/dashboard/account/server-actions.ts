"use server"
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function changePassword({ next }: { current: string; next: string }) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    try {
        const clerk = await clerkClient();
        // Clerk API does not support verifying current password directly via server SDK; this is a placeholder.
        await clerk.users.updateUser(userId, { password: next });
        return { ok: true }
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'error'
        return { ok: false, error: msg }
    }
}

export async function listSessions() {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        // Clerk session listing: filter sessions by user id via query param
        const url = `https://api.clerk.com/v1/sessions?user_id=${encodeURIComponent(userId)}`
        const resp = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        })
        const raw = await resp.text()
        if (!resp.ok) {
            return { ok: false, error: `fetch_failed_${resp.status}`, status: resp.status, body: raw.slice(0, 300) }
        }
        let parsed: unknown
        try { parsed = JSON.parse(raw) } catch {
            return { ok: false, error: 'invalid_json' }
        }
        interface MaybeData { data?: unknown }
        const maybe = parsed as MaybeData
        const arr = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray(maybe.data) ? maybe.data : [])
        const toIso = (raw?: number): string => {
            if (!raw) return new Date().toISOString()
            // Heuristic: if value already looks like ms (> 1e12) treat as ms; otherwise treat as seconds
            const ms = raw > 1e12 ? raw : raw * 1000
            return new Date(ms).toISOString()
        }
        const baseSessions = (arr as Array<{ id: string; last_active_at?: number; updated_at?: number; created_at?: number; status?: string }>).map(s => ({
            id: s.id,
            latestActivityAt: toIso(s.last_active_at || s.updated_at || s.created_at),
            current: false as boolean,
            status: s.status || 'active'
        }))
        // Enrich with user agent by fetching each session detail (limit to first 15 to avoid excessive calls)
        const subset = baseSessions.slice(0, 15)
        function parseUserAgent(ua: string) {
            const lower = ua.toLowerCase()
            let os = 'Unknown OS'
            if (lower.includes('windows')) os = 'Windows'
            else if (lower.includes('mac os x') || lower.includes('macintosh')) os = 'macOS'
            else if (lower.includes('iphone') || lower.includes('ios')) os = 'iOS'
            else if (lower.includes('android')) os = 'Android'
            else if (lower.includes('linux')) os = 'Linux'
            let browser = 'Unknown Browser'
            if (lower.includes('edg/')) browser = 'Edge'
            else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'Chrome'
            else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari'
            else if (lower.includes('firefox')) browser = 'Firefox'
            return { os, browser, label: browser === 'Unknown Browser' && os === 'Unknown OS' ? 'Unknown device' : `${browser} on ${os}` }
        }
        const enriched = await Promise.all(subset.map(async s => {
            try {
                const detailResp = await fetch(`https://api.clerk.com/v1/sessions/${s.id}`, {
                    headers: { 'Authorization': `Bearer ${secret}` }, cache: 'no-store'
                })
                if (!detailResp.ok) return { ...s }
                const detailText = await detailResp.text()
                interface SessionDetail { user_agent?: string; userAgent?: string; client?: { user_agent?: string } }
                let detail: SessionDetail = {}
                try { detail = JSON.parse(detailText) as SessionDetail } catch { /* ignore */ }
                const ua: string | undefined = detail.user_agent || detail.userAgent || detail.client?.user_agent
                if (ua) {
                    const parsed = parseUserAgent(ua)
                    return { ...s, device: parsed.label, userAgent: ua }
                }
                return { ...s }
            } catch { return { ...s } }
        }))
        // Merge enriched back preserving order
        const enrichedMap = new Map(enriched.map(e => [e.id, e]))
        const sessions = baseSessions.map(s => enrichedMap.get(s.id) || s)
        return { ok: true, sessions }
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'failed'
        return { ok: false, error: msg }
    }
}

export async function revokeSession(id: string) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        // Attempt HTTP DELETE first (if supported); fallback to Clerk documented POST revoke endpoint
        let resp = await fetch(`https://api.clerk.com/v1/sessions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${secret}` }
        })
        if (!resp.ok) {
            resp = await fetch(`https://api.clerk.com/v1/sessions/${id}/revoke`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${secret}` }
            })
        }
        if (!resp.ok) {
            const body = await resp.text()
            return { ok: false, error: `revoke_failed_${resp.status}`, body: body.slice(0, 200) }
        }
        return { ok: true }
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'failed'
        return { ok: false, error: msg }
    }
}

export async function unlinkExternalAccount(externalAccountId: string) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    if (!externalAccountId) return { ok: false, error: 'missing_id' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const resp = await fetch(`https://api.clerk.com/v1/users/${userId}/external_accounts/${externalAccountId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${secret}` },
            cache: 'no-store'
        })
        if (!resp.ok) {
            const body = await resp.text()
            return { ok: false, error: `unlink_failed_${resp.status}`, body: body.slice(0, 200) }
        }
        return { ok: true }
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'failed'
        return { ok: false, error: msg }
    }
}

export async function uploadAvatar(formData: FormData) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    const file = formData.get('file') as File | null
    if (!file) return { ok: false, error: 'no_file' }
    if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'file_too_large' }
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) return { ok: false, error: 'unsupported_type' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const fd = new FormData()
        fd.append('file', file, file.name || 'avatar')
        const resp = await fetch(`https://api.clerk.com/v1/users/${userId}/profile_image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${secret}` },
            body: fd,
            cache: 'no-store'
        })
        const text = await resp.text()
        if (!resp.ok) return { ok: false, error: 'upload_failed', body: text.slice(0, 300) }
        let json: unknown
        try { json = JSON.parse(text) } catch { /* ignore */ }
        interface UserResp { image_url?: string; profile_image_url?: string }
        const u = json as UserResp
        const imageUrl = (u && (u.profile_image_url || u.image_url)) || undefined
        return { ok: true, imageUrl }
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'failed'
        return { ok: false, error: msg }
    }
}

export async function removeAvatar() {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const resp = await fetch(`https://api.clerk.com/v1/users/${userId}/profile_image`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${secret}` }
        })
        if (!resp.ok) {
            const body = await resp.text()
            return { ok: false, error: 'remove_failed', body: body.slice(0, 200) }
        }
        return { ok: true }
    } catch (e: unknown) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as { message?: unknown }).message) : 'failed'
        return { ok: false, error: msg }
    }
}

// EMAIL MANAGEMENT ACTIONS
interface ApiEmailAddress { id: string; email_address: string; verification?: { status?: string } }

function buildHeaders(secret: string, extra?: Record<string, string>) {
    return { 'Authorization': `Bearer ${secret}`, ...(extra || {}) }
}

export async function addEmailAddress(email: string) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    const e = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: 'invalid_email' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const createResp = await fetch(`https://api.clerk.com/v1/users/${userId}/email_addresses`, {
            method: 'POST',
            headers: buildHeaders(secret, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ email_address: e }),
            cache: 'no-store'
        })
        const createText = await createResp.text()
        if (!createResp.ok) return { ok: false, error: 'create_failed', body: createText.slice(0, 200) }
        let created: ApiEmailAddress | null = null
        try { created = JSON.parse(createText) as ApiEmailAddress } catch { /* ignore */ }
        if (!created?.id) return { ok: false, error: 'parse_failed' }
        // Start verification via email code
        await fetch(`https://api.clerk.com/v1/email_addresses/${created.id}/verify`, {
            method: 'POST',
            headers: buildHeaders(secret, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ strategy: 'email_code' }),
            cache: 'no-store'
        }).catch(() => { /* ignore */ })
        return { ok: true, email: { id: created.id, emailAddress: created.email_address, verified: false, primary: false } }
    } catch (err: unknown) {
        const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message) : 'failed'
        return { ok: false, error: msg }
    }
}

export async function resendEmailVerification(id: string) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const resp = await fetch(`https://api.clerk.com/v1/email_addresses/${id}/verify`, {
            method: 'POST',
            headers: buildHeaders(secret, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ strategy: 'email_code' }),
            cache: 'no-store'
        })
        if (!resp.ok) {
            return { ok: false, error: `resend_failed_${resp.status}` }
        }
        return { ok: true }
    } catch { return { ok: false, error: 'failed' } }
}

export async function attemptEmailVerification(id: string, code: string) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    const trimmed = code.trim()
    if (trimmed.length === 0) return { ok: false, error: 'empty_code' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const resp = await fetch(`https://api.clerk.com/v1/email_addresses/${id}/attempt_verification`, {
            method: 'POST',
            headers: buildHeaders(secret, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ code: trimmed }),
            cache: 'no-store'
        })
        const text = await resp.text()
        if (!resp.ok) return { ok: false, error: 'verify_failed', body: text.slice(0, 200) }
        let parsed: { status?: string } = {}
        try { parsed = JSON.parse(text) as { status?: string } } catch { /* ignore */ }
        const verified = parsed.status === 'verified'
        return { ok: true, verified }
    } catch { return { ok: false, error: 'failed' } }
}

export async function setPrimaryEmailAddress(id: string) {
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'unauthenticated' }
    try {
        const secret = process.env.CLERK_SECRET_KEY
        if (!secret) return { ok: false, error: 'missing_clerk_secret' }
        const resp = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            method: 'PATCH',
            headers: buildHeaders(secret, { 'Content-Type': 'application/json' }),
            body: JSON.stringify({ primary_email_address_id: id }),
            cache: 'no-store'
        })
        if (!resp.ok) return { ok: false, error: `primary_failed_${resp.status}` }
        return { ok: true }
    } catch { return { ok: false, error: 'failed' } }
}

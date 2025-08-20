import { NextRequest, NextResponse } from 'next/server'
import { dispatchEscalation } from '@/lib/integrations/dispatch'
import { getTenantIdStrict } from '@/lib/tenant-resolve'
import { withCORS } from '@/lib/cors'

export const runtime = 'nodejs'

export async function OPTIONS() {
    return withCORS(new Response(null, { status: 204 }))
}

export async function POST(req: NextRequest) {
    if (req.method !== 'POST') return withCORS(NextResponse.json({ error: 'method not allowed' }, { status: 405 }))
    const ev = await req.json()
    // ensure tenantId present via strict server resolution
    if (!ev?.tenantId) {
        try { ev.tenantId = await getTenantIdStrict() } catch { }
    }
    if (!ev?.tenantId || !ev?.conversationId || !ev?.sessionId || !ev?.reason || !ev?.userMessage) {
        return withCORS(NextResponse.json({ error: 'missing fields' }, { status: 400 }))
    }
    const r = await dispatchEscalation(ev)
    return withCORS(NextResponse.json(r, { status: r.ok ? 200 : 500 }))
}

import { NextRequest, NextResponse } from 'next/server'
import { dispatchEscalation } from '@/lib/integrations/dispatch'
import { resolveTenantIdFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
    const ev = await req.json()
    // ensure tenantId present
    if (!ev?.tenantId) {
        try { ev.tenantId = await resolveTenantIdFromRequest(req, true) } catch { }
    }
    if (!ev?.tenantId || !ev?.conversationId || !ev?.sessionId || !ev?.reason || !ev?.userMessage) {
        return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }
    const r = await dispatchEscalation(ev)
    return NextResponse.json(r, { status: r.ok ? 200 : 500 })
}

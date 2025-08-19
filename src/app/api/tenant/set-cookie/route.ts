import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || ''
        let tenantId = ''
        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => ({}))
            tenantId = (body?.tenantId as string) || ''
        } else {
            const url = new URL(req.url)
            tenantId = url.searchParams.get('tenantId') || ''
        }

        if (!tenantId) {
            return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
        }

        const res = NextResponse.json({ ok: true })
        res.cookies.set('hn_tenant', tenantId, {
            path: '/',
            sameSite: 'lax',
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365,
        })
        return res
    } catch (e) {
        console.error('tenant set-cookie error', e)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

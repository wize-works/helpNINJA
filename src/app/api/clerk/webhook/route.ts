import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

function getHeader(req: NextRequest, key: string): string | undefined {
    return req.headers.get(key) || undefined
}

export async function GET() {
    // Health check so you can validate the endpoint exists without svix installed
    return NextResponse.json({ ok: true, ready: Boolean(process.env.CLERK_WEBHOOK_SECRET) })
}

export async function POST(req: NextRequest) {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) return NextResponse.json({ error: 'missing_clerk_webhook_secret' }, { status: 500 })

    // Clerk webhooks (via Svix) require verifying the raw body
    const payload = await req.text()
    const headers = {
        'svix-id': getHeader(req, 'svix-id')!,
        'svix-timestamp': getHeader(req, 'svix-timestamp')!,
        'svix-signature': getHeader(req, 'svix-signature')!,
    }

    try {
        // Try to import svix at runtime only when needed
        let WebhookCtor: unknown
        try {
            const mod = await import('svix')
            WebhookCtor = (mod as unknown as { Webhook: new (s: string) => { verify: (p: string, h: Record<string, string>) => unknown } }).Webhook
        } catch {
            return NextResponse.json({ error: 'svix_not_installed', message: 'Install svix to enable signature verification.' }, { status: 501 })
        }

        const wh = new (WebhookCtor as new (s: string) => { verify: (p: string, h: Record<string, string>) => unknown })(secret)
        const evt = wh.verify(payload, headers as Record<string, string>) as unknown as { type: string; data: Record<string, unknown> }
        const type = evt.type
        const data = evt.data

        if (type === 'user.created' || type === 'user.updated') {
            const clerkId: string = (data?.id as string) || ''
            const email: string = (() => {
                const primaryId = data?.primary_email_address_id as string | undefined
                const emails = (data?.email_addresses || []) as Array<{ id: string; email_address: string }>
                const primary = emails.find(e => e.id === primaryId)
                return (primary?.email_address || emails[0]?.email_address || '').toLowerCase()
            })()
            const first = (data?.first_name as string | undefined) || null
            const last = (data?.last_name as string | undefined) || null
            const avatar = (data?.image_url as string | undefined) || null

            await query(
                `insert into public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
         values (gen_random_uuid(), $1, $2, $3, $4, $5)
         on conflict (clerk_user_id) do update
         set email=excluded.email,
             first_name=excluded.first_name,
             last_name=excluded.last_name,
             avatar_url=excluded.avatar_url,
             updated_at=now()`,
                [email, first, last, avatar, clerkId]
            )
        }

        // TODO: Handle organization and membership events later

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Clerk webhook error', err)
        return NextResponse.json({ error: 'invalid_signature_or_processing_error' }, { status: 400 })
    }
}

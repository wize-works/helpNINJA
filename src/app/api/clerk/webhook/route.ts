import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { generateUniqueSlug } from '@/lib/slug'

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

    // Raw body required for Svix verification
    const payload = await req.text()
    const headers = {
        'svix-id': getHeader(req, 'svix-id')!,
        'svix-timestamp': getHeader(req, 'svix-timestamp')!,
        'svix-signature': getHeader(req, 'svix-signature')!,
    }

    try {
        // Dynamic import only when needed
        let WebhookCtor: unknown
        try {
            const mod = await import('svix')
            WebhookCtor = (mod as unknown as { Webhook: new (s: string) => { verify: (p: string, h: Record<string, string>) => unknown } }).Webhook
        } catch (importErr) {
            console.error('❌ Failed to import svix:', importErr)
            return NextResponse.json({ error: 'svix_not_installed', message: 'Install svix to enable signature verification.' }, { status: 501 })
        }

        const wh = new (WebhookCtor as new (s: string) => { verify: (p: string, h: Record<string, string>) => unknown })(secret)
        type ClerkWebhook = { type: string; data: Record<string, unknown> }
        const evt = wh.verify(payload, headers as Record<string, string>) as unknown as ClerkWebhook

        const type = evt.type
        const data = evt.data

        // User create/update → upsert user
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

        // Organization create/update → upsert tenant
        if (type === 'organization.created' || type === 'organization.updated') {
            const orgId = (data?.id as string) || ''
            const name = (data?.name as string | undefined) || null
            const clerkSlug = (data?.slug as string | undefined) || null
            if (type === 'organization.created') {
                const uniqueSlug = name ? await generateUniqueSlug(name) : clerkSlug || 'workspace'
                await query(
                    `insert into public.tenants (id, clerk_org_id, name, slug, public_key, secret_key, plan, plan_status)
                     values (gen_random_uuid(), $1, $2, $3, 
                             'hn_pk_' || encode(gen_random_bytes(18), 'base64'), 
                             'hn_sk_' || encode(gen_random_bytes(24), 'base64'),
                             'none', 'inactive')
                     on conflict (clerk_org_id) do update set 
                         name = excluded.name,
                         updated_at = now()`,
                    [orgId, name, uniqueSlug]
                )
            } else {
                await query(
                    `update public.tenants 
                     set name = coalesce($2, name),
                         updated_at = now()
                     where clerk_org_id = $1`,
                    [orgId, name]
                )
            }
        }

        // Organization deleted → soft delete tenant
        if (type === 'organization.deleted') {
            const orgId = (data?.id as string) || ''
            await query(`update public.tenants set deleted_at = now(), updated_at = now() where clerk_org_id = $1`, [orgId])
        }

        // Membership create/update → upsert membership
        if (type === 'organizationMembership.created' || type === 'organizationMembership.updated') {
            const d = data as { [k: string]: unknown }
            const orgFromObj = (d.organization as { [k: string]: unknown } | undefined)?.id as string | undefined
            const orgFromTop = d.organization_id as string | undefined
            const orgId = orgFromObj || orgFromTop || ''
            const pud = d.public_user_data as { [k: string]: unknown } | undefined
            const userId = (pud?.user_id as string | undefined) || (d.user_id as string | undefined) || ''
            const role = ((d.role as string | undefined) || 'member').toLowerCase()
            if (orgId && userId) {
                const t = await query<{ id: string }>(`select id from public.tenants where clerk_org_id = $1`, [orgId])
                const u = await query<{ id: string }>(`select id from public.users where clerk_user_id = $1`, [userId])
                const tenantId = t.rows[0]?.id
                const internalUserId = u.rows[0]?.id
                if (tenantId && internalUserId) {
                    await query(
                        `insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
                         values ($1, $2, $3, 'active', now())
                         on conflict (tenant_id, user_id) do update set role = excluded.role, status = 'active', updated_at = now()`,
                        [tenantId, internalUserId, role]
                    )
                } else {
                    console.warn('⚠️ Missing tenant or user for membership:', { tenantId: !!tenantId, userId: !!internalUserId })
                }
            } else {
                console.warn('⚠️ Missing orgId or userId for membership:', { orgId: !!orgId, userId: !!userId })
            }
        }

        // Membership deleted → remove membership
        if (type === 'organizationMembership.deleted') {
            const d = data as { [k: string]: unknown }
            const orgFromObj = (d.organization as { [k: string]: unknown } | undefined)?.id as string | undefined
            const orgFromTop = d.organization_id as string | undefined
            const orgId = orgFromObj || orgFromTop || ''
            const pud = d.public_user_data as { [k: string]: unknown } | undefined
            const userId = (pud?.user_id as string | undefined) || (d.user_id as string | undefined) || ''
            if (orgId && userId) {
                const t = await query<{ id: string }>(`select id from public.tenants where clerk_org_id = $1`, [orgId])
                const u = await query<{ id: string }>(`select id from public.users where clerk_user_id = $1`, [userId])
                const tenantId = t.rows[0]?.id
                const internalUserId = u.rows[0]?.id
                if (tenantId && internalUserId) {
                    await query(`delete from public.tenant_members where tenant_id = $1 and user_id = $2`, [tenantId, internalUserId])
                } else {
                    console.warn('⚠️ Missing tenant or user for membership deletion:', { tenantId: !!tenantId, userId: !!internalUserId })
                }
            } else {
                console.warn('⚠️ Missing orgId or userId for membership deletion:', { orgId: !!orgId, userId: !!userId })
            }
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('❌ Clerk webhook error:', err)
        console.error('❌ Error stack:', (err as Error)?.stack)
        console.error('❌ Error message:', (err as Error)?.message)
        return NextResponse.json({ error: 'invalid_signature_or_processing_error' }, { status: 400 })
    }
}

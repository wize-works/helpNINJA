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
    console.log('🔄 Clerk webhook POST request received')

    const secret = process.env.CLERK_WEBHOOK_SECRET
    console.log('🔑 Webhook secret present:', !!secret)
    if (!secret) return NextResponse.json({ error: 'missing_clerk_webhook_secret' }, { status: 500 })

    // Clerk webhooks (via Svix) require verifying the raw body
    console.log('📝 Reading request payload...')
    const payload = await req.text()
    console.log('📝 Payload length:', payload.length)

    const headers = {
        'svix-id': getHeader(req, 'svix-id')!,
        'svix-timestamp': getHeader(req, 'svix-timestamp')!,
        'svix-signature': getHeader(req, 'svix-signature')!,
    }
    console.log('📋 Svix headers:', {
        id: !!headers['svix-id'],
        timestamp: !!headers['svix-timestamp'],
        signature: !!headers['svix-signature']
    })

    try {
        console.log('🔐 Starting signature verification...')

        // Try to import svix at runtime only when needed
        let WebhookCtor: unknown
        try {
            console.log('📦 Importing svix module...')
            const mod = await import('svix')
            WebhookCtor = (mod as unknown as { Webhook: new (s: string) => { verify: (p: string, h: Record<string, string>) => unknown } }).Webhook
            console.log('✅ Svix module imported successfully')
        } catch (importErr) {
            console.error('❌ Failed to import svix:', importErr)
            return NextResponse.json({ error: 'svix_not_installed', message: 'Install svix to enable signature verification.' }, { status: 501 })
        }

        console.log('🏗️ Creating webhook verifier instance...')
        const wh = new (WebhookCtor as new (s: string) => { verify: (p: string, h: Record<string, string>) => unknown })(secret)

        console.log('🔍 Verifying webhook payload...')
        type ClerkWebhook = { type: string; data: Record<string, unknown> }
        const evt = wh.verify(payload, headers as Record<string, string>) as unknown as ClerkWebhook
        console.log('✅ Webhook signature verified successfully')

        const type = evt.type
        const data = evt.data
        console.log('📨 Event type:', type)
        console.log('📊 Event data keys:', Object.keys(data || {}))


        if (type === 'user.created' || type === 'user.updated') {
            console.log('👤 Processing user event:', type)

            const clerkId: string = (data?.id as string) || ''
            console.log('🆔 Clerk user ID:', clerkId)

            const email: string = (() => {
                const primaryId = data?.primary_email_address_id as string | undefined
                const emails = (data?.email_addresses || []) as Array<{ id: string; email_address: string }>
                const primary = emails.find(e => e.id === primaryId)
                const result = (primary?.email_address || emails[0]?.email_address || '').toLowerCase()
                console.log('📧 User email extracted:', result)
                return result
            })()

            const first = (data?.first_name as string | undefined) || null
            const last = (data?.last_name as string | undefined) || null
            const avatar = (data?.image_url as string | undefined) || null
            console.log('👤 User details - first:', first, 'last:', last, 'avatar:', !!avatar)

            console.log('💾 Inserting/updating user in database...')
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
            console.log('✅ User database operation completed')
        }

        // Handle organization + membership events → map to tenants + tenant_members
        if (type === 'organization.created' || type === 'organization.updated') {
            console.log('🏢 Processing organization event:', type)

            const orgId = (data?.id as string) || ''
            const name = (data?.name as string | undefined) || null
            const clerkSlug = (data?.slug as string | undefined) || null
            console.log('🏢 Organization details - ID:', orgId, 'name:', name, 'clerkSlug:', clerkSlug)

            if (type === 'organization.created') {
                console.log('🆕 Creating new organization - generating unique slug...')

                // Generate a unique slug from the name
                const uniqueSlug = name ? await generateUniqueSlug(name) : clerkSlug || 'workspace'
                console.log('🔗 Generated unique slug:', uniqueSlug)

                console.log('💾 Inserting new organization in database...')
                console.log('🔑 Generating API keys and setting "none" plan with inactive status for new organization...')

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
                console.log('✅ New organization created successfully (or updated if exists) with slug:', uniqueSlug)
            } else {
                // For updates, only update name (not slug to avoid breaking existing integrations)
                console.log('🔄 Updating existing organization...')
                await query(
                    `update public.tenants 
                     set name = coalesce($2, name),
                         updated_at = now()
                     where clerk_org_id = $1`,
                    [orgId, name]
                )
                console.log('✅ Organization update completed')
            }
        }

        if (type === 'organization.deleted') {
            console.log('🗑️ Processing organization deletion')

            const orgId = (data?.id as string) || ''
            console.log('🗑️ Deleting organization ID:', orgId)

            console.log('💾 Marking organization as deleted in database...')
            await query(`update public.tenants set deleted_at = now(), updated_at = now() where clerk_org_id = $1`, [orgId])
            console.log('✅ Organization deletion completed')
        }

        if (type === 'organizationMembership.created' || type === 'organizationMembership.updated') {
            console.log('👥 Processing organization membership event:', type)

            // Narrow unknown data with index signatures to avoid any
            const d = data as { [k: string]: unknown }
            const orgFromObj = (d.organization as { [k: string]: unknown } | undefined)?.id as string | undefined
            const orgFromTop = d.organization_id as string | undefined
            const orgId = orgFromObj || orgFromTop || ''
            console.log('🏢 Membership org ID (from obj):', orgFromObj, '(from top):', orgFromTop, '(final):', orgId)

            const pud = d.public_user_data as { [k: string]: unknown } | undefined
            const userId = (pud?.user_id as string | undefined) || (d.user_id as string | undefined) || ''
            const role = ((d.role as string | undefined) || 'member').toLowerCase()
            console.log('👤 Membership user ID:', userId, 'role:', role)

            if (orgId && userId) {
                console.log('🔍 Looking up tenant and user in database...')
                const t = await query<{ id: string }>(`select id from public.tenants where clerk_org_id = $1`, [orgId])
                const u = await query<{ id: string }>(`select id from public.users where clerk_user_id = $1`, [userId])
                const tenantId = t.rows[0]?.id
                const internalUserId = u.rows[0]?.id
                console.log('🔍 Tenant lookup result:', !!tenantId, 'User lookup result:', !!internalUserId)

                if (tenantId && internalUserId) {
                    console.log('💾 Inserting/updating membership in database...')
                    await query(
                        `insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
                         values ($1, $2, $3, 'active', now())
                         on conflict (tenant_id, user_id) do update set role = excluded.role, status = 'active', updated_at = now()`,
                        [tenantId, internalUserId, role]
                    )
                    console.log('✅ Membership database operation completed')
                } else {
                    console.warn('⚠️ Missing tenant or user for membership:', { tenantId: !!tenantId, userId: !!internalUserId })
                }
            } else {
                console.warn('⚠️ Missing orgId or userId for membership:', { orgId: !!orgId, userId: !!userId })
            }
        }

        if (type === 'organizationMembership.deleted') {
            console.log('🗑️ Processing organization membership deletion')

            const d = data as { [k: string]: unknown }
            const orgFromObj = (d.organization as { [k: string]: unknown } | undefined)?.id as string | undefined
            const orgFromTop = d.organization_id as string | undefined
            const orgId = orgFromObj || orgFromTop || ''
            const pud = d.public_user_data as { [k: string]: unknown } | undefined
            const userId = (pud?.user_id as string | undefined) || (d.user_id as string | undefined) || ''
            console.log('🗑️ Membership deletion - orgId:', orgId, 'userId:', userId)

            if (orgId && userId) {
                console.log('🔍 Looking up tenant and user for deletion...')
                const t = await query<{ id: string }>(`select id from public.tenants where clerk_org_id = $1`, [orgId])
                const u = await query<{ id: string }>(`select id from public.users where clerk_user_id = $1`, [userId])
                const tenantId = t.rows[0]?.id
                const internalUserId = u.rows[0]?.id
                console.log('🔍 Deletion lookup result - tenant:', !!tenantId, 'user:', !!internalUserId)

                if (tenantId && internalUserId) {
                    console.log('💾 Deleting membership from database...')
                    await query(`delete from public.tenant_members where tenant_id = $1 and user_id = $2`, [tenantId, internalUserId])
                    console.log('✅ Membership deletion completed')
                } else {
                    console.warn('⚠️ Missing tenant or user for membership deletion:', { tenantId: !!tenantId, userId: !!internalUserId })
                }
            } else {
                console.warn('⚠️ Missing orgId or userId for membership deletion:', { orgId: !!orgId, userId: !!userId })
            }
        }

        console.log('✅ Webhook processing completed successfully')
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('❌ Clerk webhook error:', err)
        console.error('❌ Error stack:', (err as Error)?.stack)
        console.error('❌ Error message:', (err as Error)?.message)
        return NextResponse.json({ error: 'invalid_signature_or_processing_error' }, { status: 400 })
    }
}

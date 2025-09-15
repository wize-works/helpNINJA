import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { generateUniqueSlug } from '@/lib/slug'
import { createClerkClient } from '@clerk/backend'

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

        // User create/update → upsert user and check for accepted invitations
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

            // Upsert user with robust error handling for email conflicts
            let userId: string | undefined;
            try {
                const userResult = await query(
                    `insert into public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
                     values (gen_random_uuid(), $1, $2, $3, $4, $5)
                     on conflict (clerk_user_id) do update
                     set email=excluded.email,
                         first_name=excluded.first_name,
                         last_name=excluded.last_name,
                         avatar_url=excluded.avatar_url,
                         updated_at=now()
                     returning id`,
                    [email, first, last, avatar, clerkId]
                );
                userId = userResult.rows[0]?.id;
                console.log(`✅ Webhook: User upserted with internal ID: ${userId}`);
            } catch (insertErr: unknown) {
                // Handle duplicate email constraint violation
                const err = insertErr as { code?: string; constraint?: string };
                if (err?.code === '23505' && err?.constraint === 'users_email_key') {
                    console.log(`🔄 Webhook: Email ${email} already exists, updating clerk_user_id mapping`);
                    try {
                        const updateResult = await query(
                            `update public.users 
                             set clerk_user_id = $1, first_name = $2, last_name = $3, avatar_url = $4, updated_at = now()
                             where email = $5
                             returning id`,
                            [clerkId, first, last, avatar, email]
                        );
                        userId = updateResult.rows[0]?.id;
                        console.log(`✅ Webhook: Updated existing user with clerk_user_id, internal ID: ${userId}`);
                    } catch (updateErr) {
                        console.error('❌ Webhook: Failed to update existing user with clerk_user_id:', updateErr);
                        throw updateErr;
                    }
                } else {
                    console.error('❌ Webhook: User upsert failed:', insertErr);
                    throw insertErr;
                }
            }

            // Check for accepted invitations and complete them
            if (type === 'user.created' && userId && email) {
                console.log(`🔍 Webhook: Processing user.created for email: ${email}, userId: ${userId}`);
                try {
                    const acceptedInvitations = await query(
                        `SELECT tmi.id, tmi.tenant_id, tmi.role, tmi.first_name, tmi.last_name
                         FROM public.tenant_member_invitations tmi
                         WHERE tmi.email = $1 AND tmi.status = 'accepted'`,
                        [email]
                    );

                    console.log(`🔍 Webhook: Found ${acceptedInvitations.rows.length} accepted invitations for ${email}`);

                    if (acceptedInvitations.rows.length === 0) {
                        console.log(`ℹ️ Webhook: No accepted invitations found for ${email}`);
                    }

                    for (const invitation of acceptedInvitations.rows) {
                        console.log(`🔧 Webhook: Processing invitation ${invitation.id} for tenant ${invitation.tenant_id}`);

                        try {
                            // Create the actual tenant membership
                            console.log(`🔧 Webhook: Creating tenant membership for user ${userId} in tenant ${invitation.tenant_id} with role ${invitation.role}`);
                            const membershipResult = await query(
                                `INSERT INTO public.tenant_members (tenant_id, user_id, role, status, joined_at)
                                 VALUES ($1, $2, $3, 'active', NOW())
                                 ON CONFLICT (tenant_id, user_id) DO UPDATE SET 
                                    role = EXCLUDED.role, 
                                    status = 'active', 
                                    joined_at = COALESCE(public.tenant_members.joined_at, NOW()),
                                    updated_at = NOW()
                                 RETURNING id`,
                                [invitation.tenant_id, userId, invitation.role]
                            );
                            console.log(`✅ Webhook: Created/updated tenant membership with ID: ${membershipResult.rows[0]?.id}`);

                            // Mark invitation as completed
                            console.log(`🔧 Webhook: Marking invitation ${invitation.id} as completed`);
                            await query(
                                'UPDATE public.tenant_member_invitations SET status = \'completed\', completed_at = NOW(), updated_at = NOW() WHERE id = $1',
                                [invitation.id]
                            );

                            // Log activity
                            await query(
                                `INSERT INTO public.team_activity (tenant_id, user_id, action, resource_type, resource_id, details)
                                 VALUES ($1, $2, 'invitation_completed', 'invitation', $3, $4)`,
                                [invitation.tenant_id, userId, invitation.id, JSON.stringify({
                                    email,
                                    role: invitation.role,
                                    source: 'clerk_webhook',
                                    clerk_user_id: clerkId
                                })]
                            );

                            console.log(`✅ Completed invitation for ${email} in tenant ${invitation.tenant_id} with role ${invitation.role}`);
                        } catch (invitationProcessingError) {
                            console.error(`❌ Webhook: Error processing invitation ${invitation.id}:`, invitationProcessingError);
                            // Continue with next invitation even if this one fails
                        }
                    }

                    if (acceptedInvitations.rows.length > 0) {
                        console.log(`✅ Processed ${acceptedInvitations.rows.length} accepted invitations for ${email}`);
                    }
                } catch (invitationError) {
                    console.error('❌ Webhook: Error processing accepted invitations:', invitationError);
                    // Don't fail the entire webhook for invitation processing errors
                }
            }
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

            console.log(`🔍 Webhook: Processing ${type} for org ${orgId}, user ${userId}, role ${role}`);

            if (orgId && userId) {
                const t = await query<{ id: string }>(`select id from public.tenants where clerk_org_id = $1`, [orgId])
                const u = await query<{ id: string }>(`select id from public.users where clerk_user_id = $1`, [userId])

                const tenantId = t.rows[0]?.id
                let internalUserId = u.rows[0]?.id

                // If user doesn't exist yet, try to create them from Clerk data
                if (!internalUserId && userId) {
                    try {
                        console.log(`🔧 Webhook: User ${userId} not found in database, attempting to create from Clerk data`);
                        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
                        const clerkUser = await clerk.users.getUser(userId);

                        if (clerkUser.emailAddresses?.[0]?.emailAddress) {
                            const email = clerkUser.emailAddresses[0].emailAddress.toLowerCase();
                            const first = clerkUser.firstName || '';
                            const last = clerkUser.lastName || '';
                            const avatar = clerkUser.imageUrl || null;

                            try {
                                const userResult = await query<{ id: string }>(
                                    `insert into public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
                                     values (gen_random_uuid(), $1, $2, $3, $4, $5)
                                     on conflict (clerk_user_id) do update
                                     set email=excluded.email,
                                         first_name=excluded.first_name,
                                         last_name=excluded.last_name,
                                         avatar_url=excluded.avatar_url,
                                         updated_at=now()
                                     returning id`,
                                    [email, first, last, avatar, userId]
                                );
                                internalUserId = userResult.rows[0]?.id;
                                console.log(`✅ Webhook: Created user ${userId} with internal ID ${internalUserId}`);
                            } catch (insertErr: unknown) {
                                // Handle duplicate email constraint violation
                                const err = insertErr as { code?: string; constraint?: string };
                                if (err?.code === '23505' && err?.constraint === 'users_email_key') {
                                    console.log(`🔄 Webhook: Email ${email} already exists, updating clerk_user_id mapping`);
                                    try {
                                        const updateResult = await query<{ id: string }>(
                                            `update public.users 
                                             set clerk_user_id = $1, first_name = $2, last_name = $3, avatar_url = $4, updated_at = now()
                                             where email = $5
                                             returning id`,
                                            [userId, first, last, avatar, email]
                                        );
                                        internalUserId = updateResult.rows[0]?.id;
                                        console.log(`✅ Webhook: Updated existing user with clerk_user_id, internal ID: ${internalUserId}`);
                                    } catch (updateErr) {
                                        console.error('❌ Webhook: Failed to update existing user with clerk_user_id:', updateErr);
                                        throw updateErr;
                                    }
                                } else {
                                    console.error('❌ Webhook: User creation failed:', insertErr);
                                    throw insertErr;
                                }
                            }
                        }
                    } catch (userCreationError) {
                        console.error('❌ Webhook: Failed to create user from Clerk data:', userCreationError);
                    }
                }

                if (tenantId && internalUserId) {
                    await query(
                        `insert into public.tenant_members (tenant_id, user_id, role, status, joined_at)
                         values ($1, $2, $3, 'active', now())
                         on conflict (tenant_id, user_id) do update set role = excluded.role, status = 'active'`,
                        [tenantId, internalUserId, role]
                    );
                    console.log(`✅ Webhook: Created/updated tenant membership for user ${userId} in tenant ${tenantId} with role ${role}`);

                    // Mark any pending invitations as completed
                    if (pud?.email_address) {
                        const email = (pud.email_address as string).toLowerCase();
                        await query(
                            `UPDATE public.tenant_member_invitations 
                             SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                             WHERE tenant_id = $1 AND email = $2 AND status = 'accepted'`,
                            [tenantId, email]
                        );
                        console.log(`✅ Webhook: Marked completed any accepted invitations for ${email} in tenant ${tenantId}`);
                    }
                } else {
                    console.warn('⚠️ Missing tenant or user for membership:', { tenantId: !!tenantId, userId: !!internalUserId, clerkUserId: userId })
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

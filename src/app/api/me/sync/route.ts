import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST() {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const u = await currentUser()
    if (!u) return NextResponse.json({ error: 'user_not_found' }, { status: 404 })

    const email = u.primaryEmailAddress?.emailAddress || ''
    const first = u.firstName || null
    const last = u.lastName || null
    const avatar = u.imageUrl || null

    try {
        const r = await query<{ id: string }>(
            `insert into public.users (id, email, first_name, last_name, avatar_url, clerk_user_id)
            values (gen_random_uuid(), $1, $2, $3, $4, $5)
            on conflict (clerk_user_id) do update
            set email=excluded.email,
                first_name=excluded.first_name,
                last_name=excluded.last_name,
                avatar_url=excluded.avatar_url,
                updated_at=now()
            returning id`,
            [email, first, last, avatar, u.id]
        )
        return NextResponse.json({ ok: true, userId: r.rows[0]?.id })
    } catch (err) {
        console.error('sync user failed', err)
        return NextResponse.json({ error: 'sync_failed' }, { status: 500 })
    }
}

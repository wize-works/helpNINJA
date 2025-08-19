import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/limits'
import { getTenantIdStrict } from '@/lib/tenant-resolve'

export const runtime = 'nodejs'

type SiteRow = {
    id: string
    tenant_id: string
    domain: string
    name: string
    status: 'active' | 'paused' | 'pending'
    verified: boolean
    verification_token: string | null
    created_at: string
    updated_at: string
}

export async function GET() {
    const tenantId = await getTenantIdStrict()

    try {
        const { rows } = await query<SiteRow & { script_key: string }>(
            `SELECT id, tenant_id, domain, name, status, verified, verification_token, script_key, created_at, updated_at 
       FROM public.tenant_sites 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC`,
            [tenantId]
        )
        return NextResponse.json(rows)
    } catch (error) {
        console.error('Error fetching tenant sites:', error)
        return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const body = await req.json() as {
        tenantId?: string
        domain?: string
        name?: string
        status?: 'active' | 'paused' | 'pending'
    }

    const tenantId = await getTenantIdStrict()
    const { domain, name, status = 'pending' } = body

    // Validate required fields
    if (!tenantId || !domain || !name) {
        return NextResponse.json({ error: 'Missing required fields: domain, name' }, { status: 400 })
    }

    // Validate domain format (basic validation)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain)) {
        return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
    }

    try {
        // Plan-based gating: max sites per plan
        const t = await query<{ plan: keyof typeof PLAN_LIMITS }>('select plan from public.tenants where id=$1', [tenantId])
        const planKey = (t.rows[0]?.plan || 'none') as keyof typeof PLAN_LIMITS
        const limit = PLAN_LIMITS[planKey].sites
        const c = await query<{ cnt: string }>('select count(*)::int as cnt from public.tenant_sites where tenant_id=$1', [tenantId])
        const current = Number(c.rows[0]?.cnt || 0)
        if (current >= limit) {
            return NextResponse.json({ error: 'site limit reached', plan: planKey, current, limit, host: domain }, { status: 402 })
        }

        // Check if domain already exists for this tenant
        const existingDomain = await query(
            'SELECT id FROM public.tenant_sites WHERE tenant_id = $1 AND domain = $2',
            [tenantId, domain]
        )

        if (existingDomain.rowCount && existingDomain.rowCount > 0) {
            return NextResponse.json({ error: 'Domain already registered for this tenant' }, { status: 409 })
        }

        // Generate verification token
        const verificationToken = crypto.randomUUID()

        // Insert new site (script_key has a DB default; return it)
        const { rows } = await query<{ id: string; script_key: string }>(
            `INSERT INTO public.tenant_sites (tenant_id, domain, name, status, verified, verification_token)
       VALUES ($1, $2, $3, $4, false, $5)
       RETURNING id, script_key`,
            [tenantId, domain, name, status, verificationToken]
        )

        return NextResponse.json({
            id: rows[0].id,
            domain,
            name,
            status,
            verified: false,
            verification_token: verificationToken,
            script_key: rows[0].script_key
        })
    } catch (error) {
        console.error('Error creating tenant site:', error)
        return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { resolveTenantIdFromRequest } from '@/lib/auth'

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

export async function GET(req: NextRequest) {
    let tenantId: string
    try {
        tenantId = await resolveTenantIdFromRequest(req, true)
    } catch {
        return NextResponse.json([], { status: 200 })
    }

    try {
        const { rows } = await query<SiteRow>(
            `SELECT id, tenant_id, domain, name, status, verified, verification_token, created_at, updated_at 
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

    const tenantId = body.tenantId || (await resolveTenantIdFromRequest(req, true))
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

        // Insert new site
        const { rows } = await query<{ id: string }>(
            `INSERT INTO public.tenant_sites (tenant_id, domain, name, status, verified, verification_token)
       VALUES ($1, $2, $3, $4, false, $5)
       RETURNING id`,
            [tenantId, domain, name, status, verificationToken]
        )

        return NextResponse.json({
            id: rows[0].id,
            domain,
            name,
            status,
            verified: false,
            verification_token: verificationToken
        })
    } catch (error) {
        console.error('Error creating tenant site:', error)
        return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
    }
}

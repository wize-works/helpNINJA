import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getTenantIdStrict } from '@/lib/tenant-resolve'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

type SiteRow = {
    id: string
    tenant_id: string
    domain: string
    name: string
    status: 'active' | 'paused' | 'pending'
    verified: boolean
    verification_token: string | null
    script_key?: string
    created_at: string
    updated_at: string
}

export async function GET(_req: NextRequest, ctx: Context) {
    const tenantId = await getTenantIdStrict()
    const { id } = await ctx.params

    if (!id) {
        return NextResponse.json({ error: 'Missing site ID' }, { status: 400 })
    }

    try {
        const { rows } = await query<SiteRow>(
            `SELECT id, tenant_id, domain, name, status, verified, verification_token, script_key, created_at, updated_at
       FROM public.tenant_sites 
       WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        )

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 })
        }

        return NextResponse.json(rows[0])
    } catch (error) {
        console.error('Error fetching site:', error)
        return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    const tenantId = await getTenantIdStrict()
    const { id } = await ctx.params

    if (!id) {
        return NextResponse.json({ error: 'Missing site ID' }, { status: 400 })
    }

    const body = await req.json() as {
        domain?: string
        name?: string
        status?: 'active' | 'paused' | 'pending'
    }

    const { domain, name, status } = body

    // Validate domain format if provided
    if (domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        if (!domainRegex.test(domain)) {
            return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
        }
    }

    try {
        // Check if site exists and belongs to tenant
        const existingSite = await query(
            'SELECT id FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        )

        if (existingSite.rowCount === 0) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 })
        }

        // Check if domain already exists for this tenant (if domain is being updated)
        if (domain) {
            const domainConflict = await query(
                'SELECT id FROM public.tenant_sites WHERE tenant_id = $1 AND domain = $2 AND id != $3',
                [tenantId, domain, id]
            )

            if ((domainConflict.rowCount ?? 0) > 0) {
                return NextResponse.json({ error: 'Domain already registered for this tenant' }, { status: 409 })
            }
        }

        // Build dynamic update query
        const updates: string[] = []
        const values: (string | boolean)[] = []
        let paramIndex = 1

        if (domain !== undefined) {
            updates.push(`domain = $${paramIndex++}`)
            values.push(domain)
            // Reset verification if domain changes
            updates.push(`verified = false`)
            updates.push(`verification_token = $${paramIndex++}`)
            values.push(crypto.randomUUID())
        }

        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`)
            values.push(name)
        }

        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`)
            values.push(status)
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
        }

        updates.push(`updated_at = now()`)
        values.push(id, tenantId)

        const { rows } = await query<SiteRow>(
            `UPDATE public.tenant_sites 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
       RETURNING id, tenant_id, domain, name, status, verified, verification_token, script_key, created_at, updated_at`,
            values
        )

        return NextResponse.json(rows[0])
    } catch (error) {
        console.error('Error updating site:', error)
        return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
    }
}

export async function DELETE(_req: NextRequest, ctx: Context) {
    const tenantId = await getTenantIdStrict()
    const { id } = await ctx.params

    if (!id) {
        return NextResponse.json({ error: 'Missing site ID' }, { status: 400 })
    }

    try {
        // Check if site has associated content
        const associatedContent = await query(
            `SELECT 
        (SELECT COUNT(*) FROM public.documents WHERE site_id = $1) as document_count,
        (SELECT COUNT(*) FROM public.chunks WHERE site_id = $1) as chunk_count,
        (SELECT COUNT(*) FROM public.sources WHERE site_id = $1) as source_count`,
            [id]
        )

        const { document_count, chunk_count, source_count } = associatedContent.rows[0]
        const totalContent = parseInt(document_count) + parseInt(chunk_count) + parseInt(source_count)

        if (totalContent > 0) {
            return NextResponse.json({
                error: 'Cannot delete site with associated content',
                details: {
                    documents: parseInt(document_count),
                    chunks: parseInt(chunk_count),
                    sources: parseInt(source_count)
                }
            }, { status: 409 })
        }

        // Delete the site
        const result = await query(
            'DELETE FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        )

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Error deleting site:', error)
        return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest, resolveTenantIdAndBodyFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

type Context = { params: { id: string } };

export async function GET(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Source ID required' }, { status: 400 });
        }

        const { rows } = await query(
            `SELECT s.*, 
                    COUNT(d.id)::int as document_count,
                    COUNT(c.id)::int as chunk_count,
                    ts.name as site_name,
                    ts.domain as site_domain
             FROM public.sources s
             LEFT JOIN public.documents d ON d.source_id = s.id
             LEFT JOIN public.chunks c ON c.document_id = d.id
             LEFT JOIN public.tenant_sites ts ON ts.id = s.site_id
             WHERE s.id = $1 AND s.tenant_id = $2
             GROUP BY s.id, ts.name, ts.domain`,
            [id, tenantId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error fetching source:', error);
        return NextResponse.json({ error: 'Failed to fetch source' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    try {
        const { tenantId, body } = await resolveTenantIdAndBodyFromRequest(req, true);
        const { id } = ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Source ID required' }, { status: 400 });
        }

        if (!body) {
            return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
        }

        const { kind, url, title, status, siteId } = body;

        // Build dynamic update query
        const updates: string[] = [];
        const params: unknown[] = [id, tenantId];
        let paramIndex = 3;

        if (kind !== undefined) {
            const validKinds = ['url', 'sitemap', 'pdf', 'manual'];
            if (!validKinds.includes(kind as string)) {
                return NextResponse.json({ error: 'Invalid source kind' }, { status: 400 });
            }
            updates.push(`kind = $${paramIndex++}`);
            params.push(kind);
        }

        if (url !== undefined) {
            updates.push(`url = $${paramIndex++}`);
            params.push(url);
        }

        if (title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            params.push(title);
        }

        if (status !== undefined) {
            const validStatuses = ['ready', 'crawling', 'error', 'disabled'];
            if (!validStatuses.includes(status as string)) {
                return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
            }
            updates.push(`status = $${paramIndex++}`);
            params.push(status);
        }

        if (siteId !== undefined) {
            // Validate siteId if provided
            if (siteId) {
                const siteCheck = await query(
                    'SELECT id FROM public.tenant_sites WHERE id = $1 AND tenant_id = $2',
                    [siteId, tenantId]
                );
                if (siteCheck.rowCount === 0) {
                    return NextResponse.json({ error: 'Invalid siteId for this tenant' }, { status: 400 });
                }
            }
            updates.push(`site_id = $${paramIndex++}`);
            params.push(siteId);
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        await query(
            `UPDATE public.sources SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            params
        );

        return NextResponse.json({ message: 'Source updated successfully' });
    } catch (error) {
        console.error('Error updating source:', error);
        return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { id } = ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Source ID required' }, { status: 400 });
        }

        // Check if source exists and belongs to tenant
        const checkResult = await query(
            'SELECT id FROM public.sources WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rowCount === 0) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        // Delete source (documents and chunks will be set to null due to ON DELETE SET NULL)
        await query('DELETE FROM public.sources WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        return NextResponse.json({ message: 'Source deleted successfully' });
    } catch (error) {
        console.error('Error deleting source:', error);
        return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
    }
}

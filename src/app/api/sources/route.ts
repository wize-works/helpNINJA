import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { resolveTenantIdFromRequest, resolveTenantIdAndBodyFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await resolveTenantIdFromRequest(req, true);
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');

        let queryText = `
            SELECT s.*, 
                   COUNT(d.id)::int as document_count,
                   COUNT(c.id)::int as chunk_count,
                   ts.name as site_name,
                   ts.domain as site_domain
            FROM public.sources s
            LEFT JOIN public.documents d ON d.source_id = s.id
            LEFT JOIN public.chunks c ON c.document_id = d.id
            LEFT JOIN public.tenant_sites ts ON ts.id = s.site_id
            WHERE s.tenant_id = $1
        `;

        const params: unknown[] = [tenantId];

        if (siteId) {
            queryText += ' AND s.site_id = $2';
            params.push(siteId);
        }

        queryText += `
            GROUP BY s.id, ts.name, ts.domain
            ORDER BY s.created_at DESC
        `;

        const { rows } = await query(queryText, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching sources:', error);
        return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { tenantId, body } = await resolveTenantIdAndBodyFromRequest(req, true);

        if (!body) {
            return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
        }

        const { kind, url, title, siteId } = body;

        if (!kind || (kind !== 'manual' && !url)) {
            return NextResponse.json({ error: 'kind and url (except for manual) are required' }, { status: 400 });
        }

        // Validate kind
        const validKinds = ['url', 'sitemap', 'pdf', 'manual'];
        if (!validKinds.includes(kind as string)) {
            return NextResponse.json({ error: 'Invalid source kind' }, { status: 400 });
        }

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

        // Insert source
        const { rows } = await query(
            `INSERT INTO public.sources (tenant_id, kind, url, title, site_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [tenantId, kind, url || null, title || null, siteId || null]
        );

        return NextResponse.json({ id: rows[0].id, message: 'Source created successfully' });
    } catch (error) {
        console.error('Error creating source:', error);
        return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
    }
}

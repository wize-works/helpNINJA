import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const tenantId = await getTenantIdStrict();

        const { rows } = await query(`
            SELECT 
                ts.id,
                ts.name,
                ts.domain,
                COALESCE(stats.document_count, 0)::int as document_count,
                COALESCE(stats.chunk_count, 0)::int as chunk_count,
                COALESCE(stats.source_count, 0)::int as source_count
            FROM public.tenant_sites ts
            LEFT JOIN (
                SELECT 
                    COALESCE(d.site_id, s.site_id) as site_id,
                    COUNT(DISTINCT d.id)::int as document_count,
                    COUNT(DISTINCT c.id)::int as chunk_count,
                    COUNT(DISTINCT s.id)::int as source_count
                FROM public.documents d
                FULL OUTER JOIN public.sources s ON s.site_id = d.site_id OR s.id = d.source_id
                LEFT JOIN public.chunks c ON c.document_id = d.id
                WHERE (d.tenant_id = $1 OR s.tenant_id = $1)
                    AND (d.site_id IS NOT NULL OR s.site_id IS NOT NULL)
                GROUP BY COALESCE(d.site_id, s.site_id)
            ) stats ON stats.site_id = ts.id
            WHERE ts.tenant_id = $1
                AND ts.verified = true
                AND ts.status = 'active'
            ORDER BY stats.document_count DESC NULLS LAST, ts.name
        `, [tenantId]);

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching site stats:', error);
        return NextResponse.json({ error: 'Failed to fetch site statistics' }, { status: 500 });
    }
}

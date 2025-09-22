import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

function csvEscape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'string' ? value : String(value);
    const needsQuotes = /[",\n\r]/.test(str) || str.includes(',');
    const escaped = str.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
}

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const url = new URL(req.url);

        const type = url.searchParams.get('type');
        const status = url.searchParams.get('status');
        const priority = url.searchParams.get('priority');
        const search = url.searchParams.get('search');
        const siteId = url.searchParams.get('siteId');
        const daysParam = url.searchParams.get('days');
        const days = Math.min(parseInt(daysParam || '30', 10) || 30, 365);

        const conditions: string[] = ['f.tenant_id = $1'];
        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        conditions.push(`f.created_at >= NOW() - INTERVAL '${days} days'`);

        if (type) { conditions.push(`f.type = $${paramIndex}`); params.push(type); paramIndex++; }
        if (status) { conditions.push(`f.status = $${paramIndex}`); params.push(status); paramIndex++; }
        if (priority) { conditions.push(`f.priority = $${paramIndex}`); params.push(priority); paramIndex++; }
        if (search) { conditions.push(`(f.title ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex})`); params.push(`%${search}%`); paramIndex++; }
        if (siteId) { conditions.push(`(f.conversation_id IS NULL OR c.site_id = $${paramIndex})`); params.push(siteId); paramIndex++; }

        const whereClause = conditions.join(' AND ');

        const sql = `
      SELECT 
        f.created_at,
        f.type,
        f.priority,
        f.status,
        f.title,
        f.description,
        f.category,
        f.tags,
        f.user_name,
        f.user_email,
        f.url,
        ts.domain as site_domain,
        f.escalated_at,
        f.resolved_at
      FROM public.feedback f
      LEFT JOIN public.conversations c ON f.conversation_id = c.id
      LEFT JOIN public.tenant_sites ts ON c.site_id = ts.id
      WHERE ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT 5000
    `;

        const { rows } = await query(sql, params);

        const headers = [
            'created_at', 'type', 'priority', 'status', 'title', 'description', 'category', 'tags', 'user_name', 'user_email', 'url', 'site_domain', 'escalated_at', 'resolved_at'
        ];

        const lines: string[] = [];
        // Add BOM for Excel compatibility
        const bom = '\uFEFF';
        lines.push(headers.join(','));

        for (const r of rows) {
            const row = [
                r.created_at ? new Date(r.created_at).toISOString() : '',
                r.type,
                r.priority,
                r.status,
                r.title,
                r.description,
                r.category || '',
                Array.isArray(r.tags) ? r.tags.join(';') : '',
                r.user_name || '',
                r.user_email || '',
                r.url || '',
                r.site_domain || '',
                r.escalated_at ? new Date(r.escalated_at).toISOString() : '',
                r.resolved_at ? new Date(r.resolved_at).toISOString() : ''
            ].map(csvEscape);
            lines.push(row.join(','));
        }

        const csv = bom + lines.join('\r\n');
        const filename = `feedback_export_${new Date().toISOString().slice(0, 10)}.csv`;
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        console.error('Export feedback error:', err);
        return NextResponse.json({ error: 'Failed to export feedback' }, { status: 500 });
    }
}

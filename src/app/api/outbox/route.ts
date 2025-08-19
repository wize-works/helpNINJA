import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const provider = searchParams.get('provider');
        const ruleId = searchParams.get('ruleId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let queryText = `
            SELECT io.*, 
                   i.name as integration_name,
                   i.provider as integration_provider,
                   er.name as rule_name,
                   c.session_id,
                   COUNT(*) OVER() as total_count
            FROM public.integration_outbox io
            LEFT JOIN public.integrations i ON i.id = io.integration_id
            LEFT JOIN public.escalation_rules er ON er.id = io.rule_id
            LEFT JOIN public.conversations c ON c.id = io.conversation_id
            WHERE io.tenant_id = $1
        `;

        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        if (status) {
            queryText += ` AND io.status = $${paramIndex++}`;
            params.push(status);
        }

        if (provider) {
            queryText += ` AND io.provider = $${paramIndex++}`;
            params.push(provider);
        }

        if (ruleId) {
            queryText += ` AND io.rule_id = $${paramIndex++}`;
            params.push(ruleId);
        }

        queryText += ` ORDER BY io.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const { rows } = await query(queryText, params);

        // Get summary statistics
        const statsQuery = await query(`
            SELECT 
                status,
                COUNT(*)::int as count,
                provider
            FROM public.integration_outbox 
            WHERE tenant_id = $1 
            GROUP BY status, provider
        `, [tenantId]);

        const stats = statsQuery.rows.reduce((acc, row) => {
            if (!acc[row.status]) acc[row.status] = {};
            acc[row.status][row.provider] = row.count;
            return acc;
        }, {} as Record<string, Record<string, number>>);

        return NextResponse.json({
            items: rows,
            totalCount: rows.length > 0 ? rows[0].total_count : 0,
            stats,
            pagination: {
                limit,
                offset,
                hasMore: rows.length === limit
            }
        });
    } catch (error) {
        console.error('Error fetching outbox items:', error);
        return NextResponse.json({ error: 'Failed to fetch outbox items' }, { status: 500 });
    }
}

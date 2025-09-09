import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Context) {
    const tenantId = await getTenantIdStrict();
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const q = searchParams.get('q'); // optional server-side search (simple ILIKE)
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    try {
        const baseParams: unknown[] = [tenantId, id];
        let filter = '';
        if (q) {
            baseParams.push(`%${q}%`);
            filter = ` AND content ILIKE $${baseParams.length}`;
        }
        // total count
        const totalRes = await query<{ count: number }>(`select count(*)::int as count from public.messages where tenant_id=$1 and conversation_id=$2${filter}`, baseParams);
        const total = totalRes.rows[0]?.count || 0;
        const messagesRes = await query<{
            id: string; role: string; content: string; created_at: string; confidence: number | null; is_human_response: boolean;
        }>(
            `select id, role, content, created_at, confidence, COALESCE(is_human_response, false) as is_human_response
       from public.messages
       where tenant_id=$1 and conversation_id=$2${filter}
       order by created_at asc
       offset $${baseParams.length + 1} limit $${baseParams.length + 2}`,
            [...baseParams, offset, limit]
        );
        return NextResponse.json({ messages: messagesRes.rows, total, offset, limit });
    } catch (e) {
        console.error('messages list error', e);
        return NextResponse.json({ error: 'failed to load messages' }, { status: 500 });
    }
}

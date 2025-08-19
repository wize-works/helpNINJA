import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Answer ID required' }, { status: 400 });
        }

        const { rows } = await query(
            `SELECT a.*, 
                    ts.name as site_name,
                    ts.domain as site_domain
             FROM public.answers a
             LEFT JOIN public.tenant_sites ts ON ts.id = a.site_id
             WHERE a.id = $1 AND a.tenant_id = $2`,
            [id, tenantId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error fetching answer:', error);
        return NextResponse.json({ error: 'Failed to fetch answer' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Answer ID required' }, { status: 400 });
        }

        const { question, answer, keywords, tags, priority, status, siteId } = body;

        // Build dynamic update query
        const updates: string[] = [];
        const params: unknown[] = [id, tenantId];
        let paramIndex = 3;

        if (question !== undefined) {
            if (!question?.trim()) {
                return NextResponse.json({ error: 'Question cannot be empty' }, { status: 400 });
            }
            updates.push(`question = $${paramIndex++}`);
            params.push(question.trim());
        }

        if (answer !== undefined) {
            if (!answer?.trim()) {
                return NextResponse.json({ error: 'Answer cannot be empty' }, { status: 400 });
            }
            updates.push(`answer = $${paramIndex++}`);
            params.push(answer.trim());
        }

        if (keywords !== undefined) {
            const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
            updates.push(`keywords = $${paramIndex++}`);
            params.push(keywordsArray);
        }

        if (tags !== undefined) {
            const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);
            updates.push(`tags = $${paramIndex++}`);
            params.push(tagsArray);
        }

        if (priority !== undefined) {
            updates.push(`priority = $${paramIndex++}`);
            params.push(priority);
        }

        if (status !== undefined) {
            const validStatuses = ['active', 'draft', 'disabled'];
            if (!validStatuses.includes(status)) {
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

        // Add updated_at
        updates.push(`updated_at = NOW()`);

        await query(
            `UPDATE public.answers SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2`,
            params
        );

        return NextResponse.json({ message: 'Answer updated successfully' });
    } catch (error) {
        console.error('Error updating answer:', error);
        return NextResponse.json({ error: 'Failed to update answer' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, ctx: Context) {
    try {
        const tenantId = await getTenantIdStrict();
        const { id } = await ctx.params;

        if (!id) {
            return NextResponse.json({ error: 'Answer ID required' }, { status: 400 });
        }

        // Check if answer exists and belongs to tenant
        const checkResult = await query(
            'SELECT id FROM public.answers WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rowCount === 0) {
            return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
        }

        // Delete answer
        await query('DELETE FROM public.answers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        return NextResponse.json({ message: 'Answer deleted successfully' });
    } catch (error) {
        console.error('Error deleting answer:', error);
        return NextResponse.json({ error: 'Failed to delete answer' }, { status: 500 });
    }
}

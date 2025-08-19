import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');
        const status = searchParams.get('status') || 'active';
        const search = searchParams.get('search');

        let queryText = `
            SELECT a.*, 
                   ts.name as site_name,
                   ts.domain as site_domain
            FROM public.answers a
            LEFT JOIN public.tenant_sites ts ON ts.id = a.site_id
            WHERE a.tenant_id = $1
        `;

        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        if (status && status !== 'all') {
            queryText += ` AND a.status = $${paramIndex++}`;
            params.push(status);
        }

        if (siteId) {
            queryText += ` AND a.site_id = $${paramIndex++}`;
            params.push(siteId);
        }

        if (search) {
            queryText += ` AND (
                a.question_tsv @@ plainto_tsquery('english', $${paramIndex}) OR
                a.question ILIKE $${paramIndex + 1} OR
                a.answer ILIKE $${paramIndex + 1} OR
                $${paramIndex} = ANY(a.keywords) OR
                $${paramIndex} = ANY(a.tags)
            )`;
            params.push(search, `%${search}%`);
            paramIndex += 2;
        }

        queryText += ' ORDER BY a.priority DESC, a.updated_at DESC';

        const { rows } = await query(queryText, params);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error fetching answers:', error);
        return NextResponse.json({ error: 'Failed to fetch answers' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const body = await req.json();
        const { question, answer, keywords, tags, priority, status, siteId } = body;

        if (!question?.trim() || !answer?.trim()) {
            return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
        }

        // Validate status
        const validStatuses = ['active', 'draft', 'disabled'];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
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

        // Ensure arrays are properly formatted
        const keywordsArray = Array.isArray(keywords) ? keywords : (keywords ? [keywords] : []);
        const tagsArray = Array.isArray(tags) ? tags : (tags ? [tags] : []);

        // Insert answer
        const { rows } = await query(
            `INSERT INTO public.answers (
                tenant_id, question, answer, keywords, tags, priority, status, site_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id`,
            [
                tenantId,
                question.trim(),
                answer.trim(),
                keywordsArray,
                tagsArray,
                priority || 0,
                status || 'active',
                siteId || null
            ]
        );

        return NextResponse.json({
            id: rows[0].id,
            message: 'Answer created successfully'
        });
    } catch (error) {
        console.error('Error creating answer:', error);
        return NextResponse.json({ error: 'Failed to create answer' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { trackActivity } from '@/lib/activity-tracker';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        // Track user activity for document searching
        await trackActivity();

        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenantId') || await getTenantIdStrict();

        if (!tenantId) {
            return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
        }

        // Extract filter parameters
        const searchQuery = searchParams.get('q') || '';
        const siteId = searchParams.get('site') || '';
        const sourceType = searchParams.get('source') || '';
        const sortBy = searchParams.get('sort') || 'created_desc';

        // Build query
        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        let queryText = `
            SELECT d.id, d.url, d.title, d.created_at, d.site_id,
                   ts.name as site_name, ts.domain as site_domain,
                   s.kind as source_kind, s.title as source_title,
                   COALESCE(c.chunk_count, 0)::int as chunk_count,
                   COALESCE(c.total_tokens, 0)::int as total_tokens,
                   char_length(d.content)::int as content_length
            FROM public.documents d
            LEFT JOIN public.tenant_sites ts ON ts.id = d.site_id
            LEFT JOIN public.sources s ON s.id = d.source_id
            LEFT JOIN (
                SELECT document_id, COUNT(*) as chunk_count, SUM(token_count) as total_tokens
                FROM public.chunks
                GROUP BY document_id
            ) c ON c.document_id = d.id
            WHERE d.tenant_id = $1
        `;

        // Add filter conditions
        if (searchQuery) {
            queryText += ` AND (d.title ILIKE $${paramIndex} OR d.url ILIKE $${paramIndex} OR d.content ILIKE $${paramIndex})`;
            params.push(`%${searchQuery}%`);
            paramIndex++;
        }

        if (siteId) {
            queryText += ` AND d.site_id = $${paramIndex}`;
            params.push(siteId);
            paramIndex++;
        }

        if (sourceType) {
            queryText += ` AND s.kind = $${paramIndex}`;
            params.push(sourceType);
            paramIndex++;
        }

        // Add sorting
        switch (sortBy) {
            case 'created_asc':
                queryText += ' ORDER BY d.created_at ASC';
                break;
            case 'title_asc':
                queryText += ' ORDER BY d.title ASC';
                break;
            case 'title_desc':
                queryText += ' ORDER BY d.title DESC';
                break;
            case 'chunks_desc':
                queryText += ' ORDER BY COALESCE(c.chunk_count,0) DESC NULLS LAST';
                break;
            case 'chunks_asc':
                queryText += ' ORDER BY COALESCE(c.chunk_count,0) ASC NULLS FIRST';
                break;
            case 'tokens_desc':
                queryText += ' ORDER BY COALESCE(c.total_tokens,0) DESC NULLS LAST';
                break;
            case 'tokens_asc':
                queryText += ' ORDER BY COALESCE(c.total_tokens,0) ASC NULLS FIRST';
                break;
            case 'created_desc':
            default:
                queryText += ' ORDER BY d.created_at DESC';
                break;
        }

        queryText += ' LIMIT 100';

        // Execute query
        const { rows } = await query(queryText, params);

        return NextResponse.json({ docs: rows });
    } catch (error) {
        console.error('Error searching documents:', error);
        return NextResponse.json({ error: "Failed to search documents" }, { status: 500 });
    }
}

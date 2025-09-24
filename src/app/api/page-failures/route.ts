/**
 * API endpoints for page failure management
 * GET /api/page-failures - List page failures with filters
 * POST /api/page-failures/resolve - Mark page failures as resolved
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrawlTrackingService } from '@/lib/crawl-tracking';
import { query } from '@/lib/db';
import type { PageFailure } from '@/lib/crawl-tracking';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const tenantId = url.searchParams.get('tenantId');
        const crawlAttemptId = url.searchParams.get('crawlAttemptId');
        const errorType = url.searchParams.get('errorType');
        const resolved = url.searchParams.get('resolved');
        const limit = url.searchParams.get('limit');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        let whereClause = 'WHERE pf.tenant_id = $1';
        const params: (string | number | boolean)[] = [tenantId];
        let paramIndex = 2;

        if (crawlAttemptId) {
            whereClause += ` AND pf.crawl_attempt_id = $${paramIndex++}`;
            params.push(crawlAttemptId);
        }

        if (errorType) {
            whereClause += ` AND pf.error_type = $${paramIndex++}`;
            params.push(errorType);
        }

        if (resolved !== null) {
            whereClause += ` AND pf.is_resolved = $${paramIndex++}`;
            params.push(resolved === 'true');
        }

        const limitClause = limit ? `LIMIT $${paramIndex++}` : 'LIMIT 100';
        if (limit) {
            params.push(parseInt(limit));
        }

        const result = await query<PageFailure>(
            `SELECT pf.* FROM public.page_failures pf
             ${whereClause}
             ORDER BY pf.created_at DESC
             ${limitClause}`,
            params
        );

        return NextResponse.json({ failures: result.rows });
    } catch (error) {
        console.error('Error fetching page failures:', error);
        return NextResponse.json(
            { error: 'Failed to fetch page failures' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, failureIds, tenantId, resolvedBy, notes } = body;

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        if (action === 'resolve') {
            if (!failureIds || !Array.isArray(failureIds) || !resolvedBy) {
                return NextResponse.json(
                    { error: 'failureIds (array) and resolvedBy are required for resolve action' },
                    { status: 400 }
                );
            }

            await CrawlTrackingService.resolvePageFailures(
                failureIds,
                tenantId,
                resolvedBy,
                notes
            );

            return NextResponse.json({
                success: true,
                message: `${failureIds.length} page failure(s) marked as resolved`
            });
        }

        return NextResponse.json(
            { error: 'Invalid action. Use "resolve".' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error processing page failures action:', error);
        return NextResponse.json(
            { error: 'Failed to process page failures action' },
            { status: 500 }
        );
    }
}
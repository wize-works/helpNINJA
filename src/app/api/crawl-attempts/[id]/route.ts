/**
 * API endpoint for specific crawl attempt details
 * GET /api/crawl-attempts/[id] - Get detailed information about a specific crawl attempt
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { CrawlAttempt, PageFailure } from '@/lib/crawl-tracking';

export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const url = new URL(request.url);
        const tenantId = url.searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        const { id } = params;

        // Get the crawl attempt
        const attemptResult = await query<CrawlAttempt>(
            `SELECT * FROM public.crawl_attempts WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (attemptResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Crawl attempt not found' },
                { status: 404 }
            );
        }

        const attempt = attemptResult.rows[0];

        // Get associated page failures
        const failuresResult = await query<PageFailure>(
            `SELECT * FROM public.page_failures 
             WHERE crawl_attempt_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC`,
            [id, tenantId]
        );

        return NextResponse.json({
            attempt,
            failures: failuresResult.rows
        });
    } catch (error) {
        console.error('Error fetching crawl attempt details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch crawl attempt details' },
            { status: 500 }
        );
    }
}
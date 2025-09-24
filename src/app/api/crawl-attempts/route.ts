/**
 * API endpoints for crawl failure tracking and manual retry functionality
 * GET /api/crawl-attempts - List crawl attempts with optional filters
 * POST /api/crawl-attempts/retry - Manually retry a failed crawl attempt
 * GET /api/crawl-attempts/[id] - Get specific crawl attempt details
 * GET /api/crawl-attempts/stats - Get failure statistics for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrawlTrackingService } from '@/lib/crawl-tracking';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const tenantId = url.searchParams.get('tenantId');
        const siteId = url.searchParams.get('siteId');
        const status = url.searchParams.get('status') as 'pending' | 'crawling' | 'success' | 'failed' | 'skipped' | null;
        const limit = url.searchParams.get('limit');
        const includeFailures = url.searchParams.get('includeFailures') === 'true';
        const retryableOnly = url.searchParams.get('retryableOnly') === 'true';

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        // Handle retryable attempts separately
        if (retryableOnly) {
            const retryableAttempts = await CrawlTrackingService.getRetryableCrawlAttempts(
                tenantId,
                siteId || undefined
            );
            return NextResponse.json({ attempts: retryableAttempts });
        }

        // Get regular attempts with optional filters
        const attempts = await CrawlTrackingService.getRecentCrawlAttempts(tenantId, {
            siteId: siteId || undefined,
            status: status || undefined,
            limit: limit ? parseInt(limit) : undefined,
            includeFailures
        });

        return NextResponse.json({ attempts });
    } catch (error) {
        console.error('Error fetching crawl attempts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch crawl attempts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, attemptId, tenantId } = body;

        if (!tenantId || !attemptId) {
            return NextResponse.json(
                { error: 'tenantId and attemptId are required' },
                { status: 400 }
            );
        }

        if (action === 'retry') {
            const newAttemptId = await CrawlTrackingService.retryCrawlAttempt(attemptId, tenantId);
            return NextResponse.json({
                success: true,
                newAttemptId,
                message: 'Crawl attempt scheduled for retry'
            });
        }

        return NextResponse.json(
            { error: 'Invalid action. Use "retry".' },
            { status: 400 }
        );
    } catch (error: unknown) {
        console.error('Error processing crawl attempt action:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process crawl attempt action' },
            { status: 500 }
        );
    }
}
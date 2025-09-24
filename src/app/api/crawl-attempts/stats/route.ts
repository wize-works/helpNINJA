/**
 * API endpoint for crawl failure statistics
 * GET /api/crawl-attempts/stats - Get detailed failure statistics for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrawlTrackingService } from '@/lib/crawl-tracking';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const tenantId = url.searchParams.get('tenantId');
        const days = url.searchParams.get('days');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'tenantId is required' },
                { status: 400 }
            );
        }

        const daysNum = days ? parseInt(days) : 30;
        if (isNaN(daysNum) || daysNum < 1) {
            return NextResponse.json(
                { error: 'days must be a positive number' },
                { status: 400 }
            );
        }

        const stats = await CrawlTrackingService.getFailureStats(tenantId, daysNum);
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching crawl stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch crawl statistics' },
            { status: 500 }
        );
    }
}
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

/**
 * GET /api/feedback/analytics - Get feedback analytics and insights
 */
export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const url = new URL(req.url);
        
        // Parse optional filters
        const siteId = url.searchParams.get('siteId');
        const days = parseInt(url.searchParams.get('days') || '30');
        const maxDays = Math.min(days, 365); // Limit to 1 year

        // Base conditions for filtering
        const conditions: string[] = ['f.tenant_id = $1'];
        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        // Date range filter
        conditions.push(`f.created_at >= NOW() - INTERVAL '${maxDays} days'`);

        // Optional site filter
        if (siteId) {
            conditions.push(`(f.conversation_id IS NULL OR c.site_id = $${paramIndex})`);
            params.push(siteId);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');
        const joinClause = siteId ? 'LEFT JOIN public.conversations c ON f.conversation_id = c.id' : '';

        // 1. Overall feedback metrics
        const overviewQuery = `
            SELECT 
                COUNT(*) as total_feedback,
                COUNT(*) FILTER (WHERE f.created_at >= NOW() - INTERVAL '7 days') as feedback_last_7_days,
                COUNT(*) FILTER (WHERE f.created_at >= NOW() - INTERVAL '30 days') as feedback_last_30_days,
                COUNT(*) FILTER (WHERE f.status = 'completed') as completed_feedback,
                COUNT(*) FILTER (WHERE f.status IN ('open', 'in_review')) as pending_feedback,
                COUNT(*) FILTER (WHERE f.priority IN ('high', 'urgent')) as high_priority_feedback,
                COUNT(*) FILTER (WHERE f.escalated_at IS NOT NULL) as escalated_feedback,
                ROUND(AVG(EXTRACT(epoch FROM (f.resolved_at - f.created_at))/3600)::numeric, 2) as avg_resolution_hours
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause}
        `;

        const { rows: overviewRows } = await query(overviewQuery, params);
        const overview = overviewRows[0];

        // 2. Feedback by type
        const typeQuery = `
            SELECT 
                f.type,
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE f.status = 'completed') as completed,
                COUNT(*) FILTER (WHERE f.priority IN ('high', 'urgent')) as high_priority
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause}
            GROUP BY f.type
            ORDER BY count DESC
        `;

        const { rows: typeRows } = await query(typeQuery, params);

        // 3. Feedback by status
        const statusQuery = `
            SELECT 
                f.status,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause}
            GROUP BY f.status
            ORDER BY count DESC
        `;

        const { rows: statusRows } = await query(statusQuery, params);

        // 4. Feedback by priority
        const priorityQuery = `
            SELECT 
                f.priority,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause}
            GROUP BY f.priority
            ORDER BY 
                CASE f.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END
        `;

        const { rows: priorityRows } = await query(priorityQuery, params);

        // 5. Daily feedback volume (last 30 days)
        const timeSeriesQuery = `
            SELECT 
                DATE(f.created_at) as date,
                COUNT(*) as feedback_count,
                COUNT(*) FILTER (WHERE f.type = 'bug') as bug_count,
                COUNT(*) FILTER (WHERE f.type = 'feature_request') as feature_request_count
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause} AND f.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(f.created_at)
            ORDER BY date DESC
            LIMIT 30
        `;

        const { rows: timeSeriesRows } = await query(timeSeriesQuery, params);

        // 6. Top tags/categories
        const tagsQuery = `
            SELECT 
                unnest(f.tags) as tag,
                COUNT(*) as count
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause} AND f.tags IS NOT NULL AND array_length(f.tags, 1) > 0
            GROUP BY tag
            ORDER BY count DESC
            LIMIT 10
        `;

        const { rows: tagsRows } = await query(tagsQuery, params);

        // 7. Resolution time analysis
        const resolutionQuery = `
            SELECT 
                f.type,
                f.priority,
                COUNT(*) as resolved_count,
                ROUND(AVG(EXTRACT(epoch FROM (f.resolved_at - f.created_at))/3600)::numeric, 2) as avg_hours,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (f.resolved_at - f.created_at))/3600)::numeric, 2) as median_hours
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause} AND f.resolved_at IS NOT NULL
            GROUP BY f.type, f.priority
            ORDER BY f.type, 
                CASE f.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END
        `;

        const { rows: resolutionRows } = await query(resolutionQuery, params);

        // 8. Recent high-priority items that need attention
        const urgentQuery = `
            SELECT 
                f.id,
                f.title,
                f.type,
                f.priority,
                f.status,
                f.created_at,
                f.escalated_at
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause} 
                AND f.priority IN ('high', 'urgent')
                AND f.status NOT IN ('completed', 'rejected')
            ORDER BY 
                CASE f.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                END,
                f.created_at DESC
            LIMIT 10
        `;

        const { rows: urgentRows } = await query(urgentQuery, params);

        // 9. User engagement stats (feedback with contact info)
        const engagementQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE f.user_email IS NOT NULL OR f.contact_value IS NOT NULL) as feedback_with_contact,
                COUNT(*) as total_feedback,
                ROUND(
                    COUNT(*) FILTER (WHERE f.user_email IS NOT NULL OR f.contact_value IS NOT NULL) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as contact_rate_percentage
            FROM public.feedback f
            ${joinClause}
            WHERE ${whereClause}
        `;

        const { rows: engagementRows } = await query(engagementQuery, params);

        return NextResponse.json({
            dailyVolume: timeSeriesRows.reverse(), // Oldest first for charts
            typeDistribution: typeRows,
            statusDistribution: statusRows,
            resolutionTimes: resolutionRows,
            // Keep original structure for compatibility
            period: {
                days: maxDays,
                siteId: siteId || null
            },
            overview: {
                ...overview,
                contact_rate: engagementRows[0]?.contact_rate_percentage || 0
            },
            breakdown: {
                by_type: typeRows,
                by_status: statusRows,
                by_priority: priorityRows
            },
            trends: {
                daily_volume: timeSeriesRows,
                resolution_times: resolutionRows
            },
            insights: {
                top_tags: tagsRows,
                urgent_items: urgentRows,
                engagement: engagementRows[0]
            }
        });

    } catch (error) {
        console.error('Error fetching feedback analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}

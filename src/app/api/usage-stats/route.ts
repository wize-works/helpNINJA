import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Get tenant usage statistics - requires 'analytics' permission
 */
async function handleGetUsage(req: AuthenticatedRequest) {
    try {
        const { tenantId } = req;

        // Get usage stats for the authenticated tenant
        const { rows } = await query(`
      SELECT 
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int as messages_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::int as messages_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::int as messages_month,
        COUNT(*)::int as messages_total,
        AVG(confidence)::numeric(4,2) as avg_confidence
      FROM public.messages 
      WHERE tenant_id = $1 AND role = 'assistant'
    `, [tenantId]);

        const usage = rows[0] || {
            messages_today: 0,
            messages_week: 0,
            messages_month: 0,
            messages_total: 0,
            avg_confidence: 0
        };

        // Get API key usage if authenticated via API key
        let apiKeyStats = null;
        if (req.apiKey) {
            const { rows: apiRows } = await query(`
        SELECT 
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int as requests_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::int as requests_week,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::int as requests_month,
          COUNT(*)::int as requests_total
        FROM public.api_usage_logs 
        WHERE api_key_id = $1
      `, [req.apiKey.id]);

            apiKeyStats = apiRows[0] || {
                requests_today: 0,
                requests_week: 0,
                requests_month: 0,
                requests_total: 0
            };
        }

        return NextResponse.json({
            tenant_id: tenantId,
            authentication: req.apiKey ? 'api_key' : 'session',
            usage_stats: usage,
            api_key_stats: apiKeyStats,
            api_key_info: req.apiKey ? {
                id: req.apiKey.id,
                name: req.apiKey.name,
                type: req.apiKey.key_type,
                permissions: req.apiKey.permissions,
                rate_limit: req.apiKey.rate_limit_per_hour
            } : null
        });
    } catch (error) {
        console.error('Error fetching usage stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch usage statistics' },
            { status: 500 }
        );
    }
}

// Export the protected route
export const GET = withAuth(handleGetUsage, {
    requiredPermissions: ['analytics'], // Requires analytics permission
    allowSessionAuth: true // Allow both API keys and session auth
});

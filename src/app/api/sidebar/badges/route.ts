import { NextResponse } from 'next/server';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

export interface SidebarBadges {
    knowledge: {
        sites: number | null;
        sources: number | null;
        documents: number | null;
        answers: number | null;
        crawlFailures: number | null; // Failed crawl attempts + unresolved page failures
        widget: number | null;
    };
    conversations: number | null; // Conversations with failed escalations
    feedback: number | null; // Urgent/unresolved feedback
    integrations: {
        installed: number; // Failed or inactive integrations count
        marketplace: number; // Always 0 for now
    };
    automation: {
        rules: number; // Always 0 for now  
        outbox: number; // Failed delivery items count
    };
}

export async function GET() {
    try {
        const tenantId = await getTenantIdStrict();

        // Helper function to execute count queries with proper error handling
        const getCount = async (sql: string, params: unknown[] = []): Promise<number> => {
            const { rows } = await query<{ count: string }>(sql, params);
            return parseInt(rows[0]?.count || '0', 10);
        };

        // Get failed/inactive integrations count
        const integrationCount = await getCount(`
            SELECT COUNT(*)::text as count 
            FROM public.integrations 
            WHERE tenant_id = $1 
            AND (status = 'error' OR status = 'disabled')
        `, [tenantId]);

        // Get failed outbox items count (items that need attention)
        const outboxCount = await getCount(`
            SELECT COUNT(*)::text as count 
            FROM public.integration_outbox 
            WHERE tenant_id = $1 
            AND status = 'failed'
        `, [tenantId]);

        // Get failed crawl attempts that can be retried
        const crawlFailureCount = await getCount(`
            SELECT COUNT(*)::text as count 
            FROM public.crawl_attempts 
            WHERE tenant_id = $1 
            AND status = 'failed' 
            AND can_retry = true
        `, [tenantId]);

        // Get unresolved page failures
        const pageFailureCount = await getCount(`
            SELECT COUNT(*)::text as count 
            FROM public.page_failures 
            WHERE tenant_id = $1 
            AND is_resolved = false
        `, [tenantId]);

        // Get urgent/unresolved feedback (note: table name is 'feedback', not 'user_feedback')
        const feedbackCount = await getCount(`
            SELECT COUNT(*)::text as count 
            FROM public.feedback 
            WHERE tenant_id = $1 
            AND (priority = 'urgent' OR (priority = 'high' AND type = 'bug'))
            AND resolved_at IS NULL
        `, [tenantId]);

        // Get conversations with failed escalations (from integration_outbox)
        const conversationCount = await getCount(`
            SELECT COUNT(DISTINCT conversation_id)::text as count 
            FROM public.integration_outbox 
            WHERE tenant_id = $1 
            AND status = 'failed' 
            AND conversation_id IS NOT NULL
        `, [tenantId]);

        // Calculate totals
        const totalCrawlFailures = crawlFailureCount + pageFailureCount;

        const badges: SidebarBadges = {
            knowledge: {
                sites: null,
                sources: null,
                documents: null,
                answers: null,
                crawlFailures: totalCrawlFailures > 0 ? totalCrawlFailures : null,
                widget: null
            },
            conversations: conversationCount > 0 ? conversationCount : null,
            feedback: feedbackCount > 0 ? feedbackCount : null,
            integrations: {
                installed: integrationCount,
                marketplace: 0 // No notifications for marketplace currently
            },
            automation: {
                rules: 0, // No notifications for rules currently
                outbox: outboxCount
            }
        };

        return NextResponse.json(badges);
    } catch (error) {
        console.error('Error fetching sidebar badges:', error);
        return NextResponse.json({ error: 'Failed to fetch sidebar badges' }, { status: 500 });
    }
}
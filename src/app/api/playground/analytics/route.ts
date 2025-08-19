import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30');

        if (days < 1 || days > 365) {
            return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 });
        }

        // Get knowledge base stats
        const kbStats = await query(`
            SELECT 
                COUNT(DISTINCT d.id)::int as total_documents,
                COUNT(DISTINCT c.id)::int as total_chunks,
                COUNT(DISTINCT ts.id)::int as total_sites,
                COUNT(DISTINCT a.id)::int as total_curated_answers,
                AVG(CASE WHEN d.created_at > NOW() - INTERVAL '${days} days' THEN 1 ELSE 0 END * 100)::int as recent_content_percentage
            FROM public.documents d
            LEFT JOIN public.chunks c ON c.document_id = d.id
            LEFT JOIN public.tenant_sites ts ON ts.tenant_id = d.tenant_id
            LEFT JOIN public.answers a ON a.tenant_id = d.tenant_id AND a.status = 'active'
            WHERE d.tenant_id = $1
        `, [tenantId]);

        // Get conversation analytics
        const conversationStats = await query(`
            SELECT 
                COUNT(DISTINCT conv.id)::int as total_conversations,
                COUNT(DISTINCT m.id)::int as total_messages,
                AVG(m.confidence)::numeric(3,2) as avg_confidence,
                COUNT(CASE WHEN m.confidence < 0.5 THEN 1 END)::int as low_confidence_messages,
                COUNT(CASE WHEN m.confidence >= 0.8 THEN 1 END)::int as high_confidence_messages
            FROM public.conversations conv
            LEFT JOIN public.messages m ON m.conversation_id = conv.id
            WHERE conv.tenant_id = $1 
            AND conv.created_at > NOW() - INTERVAL '1 day' * $2
        `, [tenantId, days]);

        // Get top performing content
        const topContent = await query(`
            SELECT 
                d.title,
                d.url,
                COUNT(m.id)::int as reference_count,
                AVG(m.confidence)::numeric(3,2) as avg_confidence_when_used
            FROM public.documents d
            LEFT JOIN public.chunks c ON c.document_id = d.id
            LEFT JOIN public.messages m ON m.content LIKE '%' || SUBSTRING(c.content, 1, 50) || '%'
            WHERE d.tenant_id = $1
            AND m.created_at > NOW() - INTERVAL '1 day' * $2
            GROUP BY d.id, d.title, d.url
            HAVING COUNT(m.id) > 0
            ORDER BY reference_count DESC, avg_confidence_when_used DESC
            LIMIT 10
        `, [tenantId, days]);

        // Get curated answers performance
        const curatedPerformance = await query(`
            SELECT 
                a.question,
                a.answer,
                a.priority,
                COUNT(CASE WHEN m.confidence >= 0.9 THEN 1 END)::int as high_confidence_uses,
                array_length(a.keywords, 1) as keyword_count,
                array_length(a.tags, 1) as tag_count
            FROM public.answers a
            LEFT JOIN public.messages m ON (
                m.content ILIKE '%' || a.question || '%' OR
                EXISTS (SELECT 1 FROM unnest(a.keywords) AS kw WHERE m.content ILIKE '%' || kw || '%')
            )
            WHERE a.tenant_id = $1 
            AND a.status = 'active'
            AND (m.created_at IS NULL OR m.created_at > NOW() - INTERVAL '1 day' * $2)
            GROUP BY a.id, a.question, a.answer, a.priority, a.keywords, a.tags
            ORDER BY a.priority DESC, high_confidence_uses DESC
            LIMIT 10
        `, [tenantId, days]);

        // Get confidence distribution
        const confidenceDistribution = await query(`
            SELECT 
                CASE 
                    WHEN m.confidence >= 0.9 THEN 'very_high'
                    WHEN m.confidence >= 0.7 THEN 'high'
                    WHEN m.confidence >= 0.5 THEN 'medium'
                    WHEN m.confidence >= 0.3 THEN 'low'
                    ELSE 'very_low'
                END as confidence_range,
                COUNT(*)::int as message_count,
                ROUND(AVG(m.confidence), 3) as avg_confidence
            FROM public.messages m
            JOIN public.conversations c ON c.id = m.conversation_id
            WHERE c.tenant_id = $1 
            AND m.role = 'assistant'
            AND m.created_at > NOW() - INTERVAL '1 day' * $2
            GROUP BY confidence_range
            ORDER BY avg_confidence DESC
        `, [tenantId, days]);

        // Calculate knowledge base health score
        const kbData = kbStats.rows[0];
        const convData = conversationStats.rows[0];

        let healthScore = 0;
        const healthFactors = [];

        // Content volume (0-25 points)
        const contentScore = Math.min(25, (kbData.total_documents || 0) * 2);
        healthScore += contentScore;
        healthFactors.push(`Content Volume: ${contentScore}/25 (${kbData.total_documents} documents)`);

        // Curated answers (0-25 points)
        const curatedScore = Math.min(25, (kbData.total_curated_answers || 0) * 5);
        healthScore += curatedScore;
        healthFactors.push(`Curated Answers: ${curatedScore}/25 (${kbData.total_curated_answers} answers)`);

        // Average confidence (0-30 points)
        const confidenceScore = Math.floor((convData.avg_confidence || 0) * 30);
        healthScore += confidenceScore;
        healthFactors.push(`Response Quality: ${confidenceScore}/30 (${convData.avg_confidence || 0} avg confidence)`);

        // Recent activity (0-20 points)
        const activityScore = Math.min(20, (convData.total_conversations || 0) > 0 ? 20 : 0);
        healthScore += activityScore;
        healthFactors.push(`Activity Level: ${activityScore}/20 (${convData.total_conversations} conversations)`);

        const analytics = {
            knowledge_base: {
                total_documents: kbData.total_documents || 0,
                total_chunks: kbData.total_chunks || 0,
                total_sites: kbData.total_sites || 0,
                total_curated_answers: kbData.total_curated_answers || 0,
                recent_content_percentage: kbData.recent_content_percentage || 0
            },
            conversations: {
                total_conversations: convData.total_conversations || 0,
                total_messages: convData.total_messages || 0,
                avg_confidence: parseFloat(convData.avg_confidence || '0'),
                low_confidence_count: convData.low_confidence_messages || 0,
                high_confidence_count: convData.high_confidence_messages || 0
            },
            performance: {
                health_score: healthScore,
                health_grade: healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D',
                health_factors: healthFactors,
                top_content: topContent.rows.map(row => ({
                    title: row.title || 'Untitled',
                    url: row.url,
                    reference_count: row.reference_count,
                    avg_confidence: parseFloat(row.avg_confidence_when_used || '0')
                })),
                curated_answers: curatedPerformance.rows.map(row => ({
                    question: row.question,
                    answer: row.answer.substring(0, 100) + (row.answer.length > 100 ? '...' : ''),
                    priority: row.priority,
                    usage_count: row.high_confidence_uses,
                    keyword_count: row.keyword_count || 0,
                    tag_count: row.tag_count || 0
                }))
            },
            confidence_distribution: confidenceDistribution.rows.map(row => ({
                range: row.confidence_range,
                count: row.message_count,
                percentage: convData.total_messages > 0
                    ? Math.round((row.message_count / convData.total_messages) * 100)
                    : 0,
                avg_confidence: parseFloat(row.avg_confidence || '0')
            })),
            metadata: {
                period_days: days,
                generated_at: new Date().toISOString(),
                tenant_id: tenantId
            }
        };

        return NextResponse.json(analytics);
    } catch (error) {
        console.error('Error fetching playground analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}

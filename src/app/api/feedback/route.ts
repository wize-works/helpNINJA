import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { resolveTenantIdAndBodyFromRequest } from '@/lib/auth';
import { handleEscalation } from '@/lib/escalation-service';
import { logEvent } from '@/lib/events';

export const runtime = 'nodejs';

// Types for feedback API
interface FeedbackSubmission {
    tenantId?: string;  // For widget submissions
    conversationId?: string;
    sessionId?: string;
    type: 'bug' | 'feature_request' | 'improvement' | 'general' | 'ui_ux' | 'performance';
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    description: string;
    stepsToReproduce?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    userEmail?: string;
    userName?: string;
    contactMethod?: 'email' | 'phone' | 'slack' | 'none';
    contactValue?: string;
    userAgent?: string;
    url?: string;
    widgetVersion?: string;
    browserInfo?: Record<string, unknown>;
    tags?: string[];
    metadata?: Record<string, unknown>;
}

interface FeedbackQuery {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    priority?: string;
    search?: string;
    siteId?: string;
}

/**
 * GET /api/feedback - List feedback for dashboard (authenticated)
 */
export async function GET(req: NextRequest) {
    try {
        const tenantId = await getTenantIdStrict();
        const url = new URL(req.url);
        
        // Parse query parameters
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
        const offset = (page - 1) * limit;
        const type = url.searchParams.get('type');
        const status = url.searchParams.get('status');
        const priority = url.searchParams.get('priority');
        const search = url.searchParams.get('search');
        const siteId = url.searchParams.get('siteId');

        // Build WHERE conditions
        const conditions: string[] = ['f.tenant_id = $1'];
        const params: unknown[] = [tenantId];
        let paramIndex = 2;

        if (type) {
            conditions.push(`f.type = $${paramIndex}`);
            params.push(type);
            paramIndex++;
        }

        if (status) {
            conditions.push(`f.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (priority) {
            conditions.push(`f.priority = $${paramIndex}`);
            params.push(priority);
            paramIndex++;
        }

        if (search) {
            conditions.push(`f.search_vector @@ plainto_tsquery('english', $${paramIndex})`);
            params.push(search);
            paramIndex++;
        }

        // Optional site filtering (if conversation is linked to a site)
        if (siteId) {
            conditions.push(`(f.conversation_id IS NULL OR c.site_id = $${paramIndex})`);
            params.push(siteId);
            paramIndex++;
        }

        const whereClause = conditions.join(' AND ');

        // Get feedback with optional conversation context
        const feedbackQuery = `
            SELECT 
                f.*,
                c.site_id,
                ts.domain as site_domain,
                COUNT(*) OVER() as total_count
            FROM public.feedback f
            LEFT JOIN public.conversations c ON f.conversation_id = c.id
            LEFT JOIN public.tenant_sites ts ON c.site_id = ts.id
            WHERE ${whereClause}
            ORDER BY f.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);
        const { rows } = await query(feedbackQuery, params);

        // Get summary stats
        const statsQuery = `
            SELECT 
                type,
                status,
                priority,
                COUNT(*) as count
            FROM public.feedback
            WHERE tenant_id = $1
            GROUP BY type, status, priority
        `;
        const { rows: statsRows } = await query(statsQuery, [tenantId]);

        return NextResponse.json({
            feedback: rows.map(row => ({
                ...row,
                total_count: undefined, // Remove from individual items
            })),
            pagination: {
                page,
                limit,
                total: rows.length > 0 ? parseInt(rows[0].total_count) : 0,
                totalPages: rows.length > 0 ? Math.ceil(parseInt(rows[0].total_count) / limit) : 0
            },
            stats: statsRows
        });

    } catch (error) {
        console.error('Error fetching feedback:', error);
        return NextResponse.json(
            { error: 'Failed to fetch feedback' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/feedback - Submit feedback (public widget or authenticated dashboard)
 */
export async function POST(req: NextRequest) {
    try {
        // Handle both widget (with tenantId in body) and dashboard (authenticated) submissions
        let tenantId: string;
        let body: FeedbackSubmission;

        // Check if this is an authenticated request (dashboard submission)
        try {
            tenantId = await getTenantIdStrict();
            body = await req.json() as FeedbackSubmission;
        } catch {
            // Not authenticated, try to resolve from request body (widget submission)
            const resolved = await resolveTenantIdAndBodyFromRequest(req, false);
            tenantId = resolved.tenantId;
            body = resolved.body as FeedbackSubmission;
        }

        // Validate required fields
        if (!body.type || !body.title?.trim() || !body.description?.trim()) {
            return NextResponse.json({
                error: 'type, title, and description are required'
            }, { status: 400 });
        }

        // Validate enum values
        const validTypes = ['bug', 'feature_request', 'improvement', 'general', 'ui_ux', 'performance'];
        if (!validTypes.includes(body.type)) {
            return NextResponse.json({
                error: 'Invalid feedback type'
            }, { status: 400 });
        }

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (body.priority && !validPriorities.includes(body.priority)) {
            return NextResponse.json({
                error: 'Invalid priority level'
            }, { status: 400 });
        }

        const validContactMethods = ['email', 'phone', 'slack', 'none'];
        if (body.contactMethod && !validContactMethods.includes(body.contactMethod)) {
            return NextResponse.json({
                error: 'Invalid contact method'
            }, { status: 400 });
        }

        // Validate conversation exists if provided
        if (body.conversationId) {
            const convCheck = await query(
                'SELECT id FROM public.conversations WHERE id = $1 AND tenant_id = $2',
                [body.conversationId, tenantId]
            );
            if (convCheck.rowCount === 0) {
                return NextResponse.json({
                    error: 'Invalid conversationId for this tenant'
                }, { status: 400 });
                }
        }

        // Capture request metadata
        const userAgent = req.headers.get('user-agent');
        const referer = req.headers.get('referer');
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
        
        // Build browser info
        const browserInfo = {
            ...(body.browserInfo || {}),
            clientIp,
            referer,
            timestamp: new Date().toISOString()
        };

        // Insert feedback
        const insertQuery = `
            INSERT INTO public.feedback (
                tenant_id, conversation_id, session_id, type, category, priority,
                title, description, steps_to_reproduce, expected_behavior, actual_behavior,
                user_name, user_email, contact_method, contact_value,
                user_agent, url, widget_version, browser_info, tags, metadata
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                $16, $17, $18, $19, $20, $21
            ) RETURNING id, created_at, escalated_at
        `;

        const { rows } = await query(insertQuery, [
            tenantId,
            body.conversationId || null,
            body.sessionId || null,
            body.type,
            body.category || null,
            body.priority || 'medium',
            body.title.trim(),
            body.description.trim(),
            body.stepsToReproduce || null,
            body.expectedBehavior || null,
            body.actualBehavior || null,
            body.userName || null,
            body.userEmail || null,
            body.contactMethod || null,
            body.contactValue || null,
            userAgent,
            body.url || referer || null,
            body.widgetVersion || null,
            JSON.stringify(browserInfo),
            body.tags || [],
            JSON.stringify(body.metadata || {})
        ]);

        const feedbackId = rows[0].id;
        const escalatedAt = rows[0].escalated_at;

        // Log feedback submission event
        logEvent({
            tenantId,
            name: 'feedback_submitted',
            data: {
                feedbackId,
                type: body.type,
                priority: body.priority || 'medium',
                hasContact: !!(body.userEmail || body.contactValue),
                escalated: !!escalatedAt
            },
            soft: true
        });

        // Auto-escalate if marked for escalation (urgent priority or high priority bugs)
        if (escalatedAt) {
            try {
                // Determine escalation reason based on feedback type and priority
                let escalationReason: 'feedback_urgent' | 'feedback_bug' | 'feedback_request' = 'feedback_urgent';
                
                if (body.type === 'bug' && body.priority === 'high') {
                    escalationReason = 'feedback_bug';
                } else if (body.type === 'feature_request' && body.priority === 'high') {
                    escalationReason = 'feedback_request';
                } else if (body.priority === 'urgent') {
                    escalationReason = 'feedback_urgent';
                }

                // Create enhanced escalation message
                const escalationTitle = `${body.type === 'bug' ? '🐛' : body.type === 'feature_request' ? '💡' : '📝'} ${body.type.replace('_', ' ').toUpperCase()}: ${body.title}`;
                
                let escalationMessage = body.description;
                
                // Add additional context for bug reports
                if (body.type === 'bug') {
                    if (body.stepsToReproduce) {
                        escalationMessage += `\n\n**Steps to Reproduce:**\n${body.stepsToReproduce}`;
                    }
                    if (body.expectedBehavior) {
                        escalationMessage += `\n\n**Expected Behavior:**\n${body.expectedBehavior}`;
                    }
                    if (body.actualBehavior) {
                        escalationMessage += `\n\n**Actual Behavior:**\n${body.actualBehavior}`;
                    }
                }

                // Add contact information if available
                if (body.userEmail || body.userName) {
                    escalationMessage += `\n\n**Contact Information:**`;
                    if (body.userName) escalationMessage += `\nName: ${body.userName}`;
                    if (body.userEmail) escalationMessage += `\nEmail: ${body.userEmail}`;
                }

                // Add feedback source context
                escalationMessage += `\n\n**Feedback Source:**\nSubmitted via ${body.url ? `website (${body.url})` : 'helpNINJA widget'}`;
                escalationMessage += `\nPriority: ${body.priority || 'medium'}`;
                escalationMessage += `\nFeedback ID: ${feedbackId}`;

                await handleEscalation({
                    tenantId,
                    conversationId: body.conversationId || `feedback-${feedbackId}`,
                    sessionId: body.sessionId || `feedback-session-${feedbackId}`,
                    reason: escalationReason,
                    userMessage: escalationTitle,
                    assistantAnswer: escalationMessage,
                    confidence: 1.0, // Feedback is always high confidence for escalation
                    refs: body.url ? [body.url] : [],
                    keywords: body.tags || [],
                    triggerWebhooks: true,
                    meta: {
                        feedbackId,
                        feedbackType: body.type,
                        priority: body.priority || 'medium',
                        contactInfo: body.userEmail || body.contactValue || null,
                        url: body.url,
                        escalationReason,
                        browserInfo: browserInfo,
                        submittedAt: new Date().toISOString()
                    }
                });

                logEvent({
                    tenantId,
                    name: 'feedback_escalated',
                    data: { feedbackId, type: body.type, priority: body.priority || 'medium' },
                    soft: true
                });
            } catch (escalationError) {
                console.error('Failed to escalate feedback:', escalationError);
                // Don't fail the feedback submission if escalation fails
            }
        }

        return NextResponse.json({
            id: feedbackId,
            message: 'Feedback submitted successfully',
            escalated: !!escalatedAt
        });

    } catch (error) {
        console.error('Error submitting feedback:', error);
        return NextResponse.json(
            { error: 'Failed to submit feedback' },
            { status: 500 }
        );
    }
}

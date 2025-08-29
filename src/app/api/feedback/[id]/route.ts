import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { logEvent } from '@/lib/events';

export const runtime = 'nodejs';

interface FeedbackUpdate {
    status?: 'open' | 'in_review' | 'planned' | 'in_progress' | 'completed' | 'rejected' | 'duplicate';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    tags?: string[];
    internalNotes?: string;
    relatedFeedbackIds?: string[];
}

interface FeedbackComment {
    comment: string;
    isInternal?: boolean;
    authorName?: string;
    authorEmail?: string;
}

/**
 * GET /api/feedback/[id] - Get specific feedback item
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const tenantId = await getTenantIdStrict();

        // Get feedback with related data
        const feedbackQuery = `
            SELECT 
                f.*,
                c.site_id,
                ts.domain as site_domain,
                c.session_id as conversation_session_id
            FROM public.feedback f
            LEFT JOIN public.conversations c ON f.conversation_id = c.id
            LEFT JOIN public.tenant_sites ts ON c.site_id = ts.id
            WHERE f.id = $1 AND f.tenant_id = $2
        `;

        const { rows } = await query(feedbackQuery, [id, tenantId]);

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Feedback not found' },
                { status: 404 }
            );
        }

        const feedback = rows[0];

        // Get comments for this feedback
        const commentsQuery = `
            SELECT id, author_type, author_name, author_email, comment, is_internal, created_at
            FROM public.feedback_comments
            WHERE feedback_id = $1
            ORDER BY created_at ASC
        `;
        const { rows: comments } = await query(commentsQuery, [id]);

        // Get attachments for this feedback
        const attachmentsQuery = `
            SELECT id, filename, original_filename, mime_type, file_size, description, created_at
            FROM public.feedback_attachments
            WHERE feedback_id = $1
            ORDER BY created_at ASC
        `;
        const { rows: attachments } = await query(attachmentsQuery, [id]);

        return NextResponse.json({
            ...feedback,
            comments,
            attachments
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
 * PATCH /api/feedback/[id] - Update feedback status, priority, etc.
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const tenantId = await getTenantIdStrict();
        const body = await req.json() as FeedbackUpdate;

        // Check if feedback exists and belongs to tenant
        const existsQuery = 'SELECT id, status FROM public.feedback WHERE id = $1 AND tenant_id = $2';
        const { rows: existingRows } = await query(existsQuery, [id, tenantId]);

        if (existingRows.length === 0) {
            return NextResponse.json(
                { error: 'Feedback not found' },
                { status: 404 }
            );
        }

        const currentStatus = existingRows[0].status;

        // Validate enum values
        const validStatuses = ['open', 'in_review', 'planned', 'in_progress', 'completed', 'rejected', 'duplicate'];
        if (body.status && !validStatuses.includes(body.status)) {
            return NextResponse.json({
                error: 'Invalid status'
            }, { status: 400 });
        }

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (body.priority && !validPriorities.includes(body.priority)) {
            return NextResponse.json({
                error: 'Invalid priority'
            }, { status: 400 });
        }

        // Build update query dynamically
        const updateFields: string[] = [];
        const updateParams: unknown[] = [];
        let paramIndex = 1;

        if (body.status !== undefined) {
            updateFields.push(`status = $${paramIndex}`);
            updateParams.push(body.status);
            paramIndex++;
        }

        if (body.priority !== undefined) {
            updateFields.push(`priority = $${paramIndex}`);
            updateParams.push(body.priority);
            paramIndex++;
        }

        if (body.category !== undefined) {
            updateFields.push(`category = $${paramIndex}`);
            updateParams.push(body.category);
            paramIndex++;
        }

        if (body.tags !== undefined) {
            updateFields.push(`tags = $${paramIndex}`);
            updateParams.push(body.tags);
            paramIndex++;
        }

        if (body.internalNotes !== undefined) {
            updateFields.push(`internal_notes = $${paramIndex}`);
            updateParams.push(body.internalNotes);
            paramIndex++;
        }

        if (body.relatedFeedbackIds !== undefined) {
            updateFields.push(`related_feedback_ids = $${paramIndex}`);
            updateParams.push(body.relatedFeedbackIds);
            paramIndex++;
        }

        // Always update the updated_at timestamp
        updateFields.push('updated_at = NOW()');

        // Set resolved_at if status changed to completed
        if (body.status === 'completed' && currentStatus !== 'completed') {
            updateFields.push('resolved_at = NOW()');
        } else if (body.status !== 'completed' && currentStatus === 'completed') {
            updateFields.push('resolved_at = NULL');
        }

        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Execute update
        updateParams.push(id, tenantId);
        const updateQuery = `
            UPDATE public.feedback 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
            RETURNING *
        `;

        const { rows } = await query(updateQuery, updateParams);

        // Log the update event
        logEvent({
            tenantId,
            name: 'feedback_updated',
            data: {
                feedbackId: id,
                changes: body,
                previousStatus: currentStatus,
                newStatus: body.status || currentStatus
            },
            soft: true
        });

        return NextResponse.json({
            ...rows[0],
            message: 'Feedback updated successfully'
        });

    } catch (error) {
        console.error('Error updating feedback:', error);
        return NextResponse.json(
            { error: 'Failed to update feedback' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/feedback/[id] - Delete feedback item
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const tenantId = await getTenantIdStrict();

        // Check if feedback exists and belongs to tenant
        const existsQuery = 'SELECT id, type FROM public.feedback WHERE id = $1 AND tenant_id = $2';
        const { rows: existingRows } = await query(existsQuery, [id, tenantId]);

        if (existingRows.length === 0) {
            return NextResponse.json(
                { error: 'Feedback not found' },
                { status: 404 }
            );
        }

        const feedbackType = existingRows[0].type;

        // Delete feedback (cascade will handle comments and attachments)
        await query('DELETE FROM public.feedback WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        // Log deletion event
        logEvent({
            tenantId,
            name: 'feedback_deleted',
            data: {
                feedbackId: id,
                type: feedbackType
            },
            soft: true
        });

        return NextResponse.json({
            message: 'Feedback deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting feedback:', error);
        return NextResponse.json(
            { error: 'Failed to delete feedback' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/feedback/[id] - Add comment to feedback (for internal tracking)
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const tenantId = await getTenantIdStrict();
        const body = await req.json() as FeedbackComment;

        if (!body.comment?.trim()) {
            return NextResponse.json(
                { error: 'Comment text is required' },
                { status: 400 }
            );
        }

        // Check if feedback exists and belongs to tenant
        const existsQuery = 'SELECT id FROM public.feedback WHERE id = $1 AND tenant_id = $2';
        const { rows: existingRows } = await query(existsQuery, [id, tenantId]);

        if (existingRows.length === 0) {
            return NextResponse.json(
                { error: 'Feedback not found' },
                { status: 404 }
            );
        }

        // Insert comment
        const insertQuery = `
            INSERT INTO public.feedback_comments (
                feedback_id, author_type, author_name, author_email, comment, is_internal
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        `;

        const { rows } = await query(insertQuery, [
            id,
            'admin', // Always admin for dashboard submissions
            body.authorName || 'Admin',
            body.authorEmail || null,
            body.comment.trim(),
            body.isInternal !== false // Default to internal unless explicitly set to false
        ]);

        // Log comment event
        logEvent({
            tenantId,
            name: 'feedback_comment_added',
            data: {
                feedbackId: id,
                commentId: rows[0].id,
                isInternal: body.isInternal !== false
            },
            soft: true
        });

        return NextResponse.json({
            id: rows[0].id,
            created_at: rows[0].created_at,
            message: 'Comment added successfully'
        });

    } catch (error) {
        console.error('Error adding feedback comment:', error);
        return NextResponse.json(
            { error: 'Failed to add comment' },
            { status: 500 }
        );
    }
}

/**
 * Service for tracking crawl attempts, failures, and providing retry capabilities
 * This provides comprehensive failure tracking and manual retry functionality for ingestion
 */

import { query } from './db';

export type CrawlAttemptStatus = 'pending' | 'crawling' | 'success' | 'failed' | 'skipped';
export type ErrorType = 'network' | 'auth' | 'conflict' | 'timeout' | 'server' | 'parsing' | 'content';

export type CrawlAttempt = {
    id: string;
    tenant_id: string;
    site_id?: string;
    source_url: string;
    source_type: 'url' | 'sitemap' | 'manual';
    parent_job_id?: string;
    attempt_number: number;
    status: CrawlAttemptStatus;
    pages_found: number;
    pages_crawled: number;
    pages_failed: number;
    pages_skipped: number;
    error_type?: ErrorType;
    error_code?: number;
    error_message?: string;
    error_details?: Record<string, unknown>;
    can_retry: boolean;
    retry_after?: Date;
    max_retries: number;
    created_at: Date;
    started_at?: Date;
    completed_at?: Date;
    updated_at: Date;
    duration_ms?: number;
    bytes_processed?: number;
};

export type PageFailure = {
    id: string;
    crawl_attempt_id: string;
    tenant_id: string;
    page_url: string;
    page_title?: string;
    error_type: ErrorType;
    error_code?: number;
    error_message: string;
    error_details?: Record<string, unknown>;
    attempt_number: number;
    user_agent?: string;
    referrer?: string;
    is_resolved: boolean;
    resolution_notes?: string;
    resolved_at?: Date;
    resolved_by?: string;
    created_at: Date;
    updated_at: Date;
};

export class CrawlTrackingService {
    /**
     * Start a new crawl attempt
     */
    static async startCrawlAttempt(params: {
        tenantId: string;
        siteId?: string;
        sourceUrl: string;
        sourceType?: 'url' | 'sitemap' | 'manual';
        parentJobId?: string;
        maxRetries?: number;
    }): Promise<string> {
        const {
            tenantId,
            siteId,
            sourceUrl,
            sourceType = 'url',
            parentJobId,
            maxRetries = 3
        } = params;

        // Check for recent attempts to determine attempt number
        const recentAttempts = await query<{ attempt_number: number }>(
            `SELECT attempt_number FROM public.crawl_attempts 
             WHERE tenant_id = $1 AND source_url = $2 
             ORDER BY created_at DESC LIMIT 1`,
            [tenantId, sourceUrl]
        );

        const attemptNumber = (recentAttempts.rows[0]?.attempt_number || 0) + 1;

        const result = await query<{ id: string }>(
            `INSERT INTO public.crawl_attempts (
                tenant_id, site_id, source_url, source_type, parent_job_id,
                attempt_number, status, max_retries, started_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'crawling', $7, now()) 
            RETURNING id`,
            [tenantId, siteId || null, sourceUrl, sourceType, parentJobId || null, attemptNumber, maxRetries]
        );

        return result.rows[0].id;
    }

    /**
     * Update crawl attempt with success results
     */
    static async completeCrawlAttempt(
        attemptId: string,
        results: {
            status: 'success' | 'failed' | 'skipped';
            pagesFound?: number;
            pagesCrawled?: number;
            pagesFailed?: number;
            pagesSkipped?: number;
            durationMs?: number;
            bytesProcessed?: number;
            errorType?: ErrorType;
            errorCode?: number;
            errorMessage?: string;
            errorDetails?: Record<string, unknown>;
            canRetry?: boolean;
            retryAfter?: Date;
        }
    ): Promise<void> {
        const {
            status,
            pagesFound = 0,
            pagesCrawled = 0,
            pagesFailed = 0,
            pagesSkipped = 0,
            durationMs,
            bytesProcessed,
            errorType,
            errorCode,
            errorMessage,
            errorDetails,
            canRetry = true,
            retryAfter
        } = results;

        await query(
            `UPDATE public.crawl_attempts SET
                status = $2,
                pages_found = $3,
                pages_crawled = $4,
                pages_failed = $5,
                pages_skipped = $6,
                duration_ms = $7,
                bytes_processed = $8,
                error_type = $9,
                error_code = $10,
                error_message = $11,
                error_details = $12,
                can_retry = $13,
                retry_after = $14,
                completed_at = now()
            WHERE id = $1`,
            [
                attemptId, status, pagesFound, pagesCrawled, pagesFailed, pagesSkipped,
                durationMs, bytesProcessed, errorType, errorCode, errorMessage,
                errorDetails ? JSON.stringify(errorDetails) : null,
                canRetry, retryAfter
            ]
        );
    }

    /**
     * Record a page failure
     */
    static async recordPageFailure(params: {
        crawlAttemptId: string;
        tenantId: string;
        pageUrl: string;
        pageTitle?: string;
        errorType: ErrorType;
        errorCode?: number;
        errorMessage: string;
        errorDetails?: Record<string, unknown>;
        attemptNumber?: number;
        userAgent?: string;
        referrer?: string;
    }): Promise<string> {
        const {
            crawlAttemptId,
            tenantId,
            pageUrl,
            pageTitle,
            errorType,
            errorCode,
            errorMessage,
            errorDetails,
            attemptNumber = 1,
            userAgent,
            referrer
        } = params;

        const result = await query<{ id: string }>(
            `INSERT INTO public.page_failures (
                crawl_attempt_id, tenant_id, page_url, page_title,
                error_type, error_code, error_message, error_details,
                attempt_number, user_agent, referrer
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id`,
            [
                crawlAttemptId, tenantId, pageUrl, pageTitle,
                errorType, errorCode, errorMessage,
                errorDetails ? JSON.stringify(errorDetails) : null,
                attemptNumber, userAgent, referrer
            ]
        );

        return result.rows[0].id;
    }

    /**
     * Get failed crawl attempts that can be retried
     */
    static async getRetryableCrawlAttempts(tenantId: string, siteId?: string): Promise<CrawlAttempt[]> {
        let whereClause = `WHERE ca.tenant_id = $1 AND ca.status = 'failed' AND ca.can_retry = true 
                          AND (ca.retry_after IS NULL OR ca.retry_after <= now())
                          AND ca.attempt_number < ca.max_retries`;
        const params: (string | number)[] = [tenantId];

        if (siteId) {
            whereClause += ` AND ca.site_id = $2`;
            params.push(siteId);
        }

        const result = await query<CrawlAttempt>(
            `SELECT ca.* FROM public.crawl_attempts ca
             ${whereClause}
             ORDER BY ca.created_at DESC`,
            params
        );

        return result.rows;
    }

    /**
     * Get recent crawl attempts with failure details
     */
    static async getRecentCrawlAttempts(
        tenantId: string,
        options: {
            siteId?: string;
            status?: CrawlAttemptStatus;
            limit?: number;
            includeFailures?: boolean;
        } = {}
    ): Promise<(CrawlAttempt & { failures?: PageFailure[] })[]> {
        const { siteId, status, limit = 50, includeFailures = false } = options;

        let whereClause = `WHERE ca.tenant_id = $1`;
        const params: (string | number)[] = [tenantId];
        let paramIndex = 2;

        if (siteId) {
            whereClause += ` AND ca.site_id = $${paramIndex++}`;
            params.push(siteId);
        }

        if (status) {
            whereClause += ` AND ca.status = $${paramIndex++}`;
            params.push(status);
        }

        const result = await query<CrawlAttempt>(
            `SELECT ca.* FROM public.crawl_attempts ca
             ${whereClause}
             ORDER BY ca.created_at DESC
             LIMIT $${paramIndex}`,
            [...params, limit]
        );

        const attempts = result.rows;

        // Optionally include page failures
        if (includeFailures && attempts.length > 0) {
            const attemptIds = attempts.map(a => a.id);
            const failures = await query<PageFailure>(
                `SELECT * FROM public.page_failures 
                 WHERE crawl_attempt_id = ANY($1)
                 ORDER BY created_at DESC`,
                [attemptIds]
            );

            // Group failures by attempt ID
            const failuresByAttempt = new Map<string, PageFailure[]>();
            for (const failure of failures.rows) {
                if (!failuresByAttempt.has(failure.crawl_attempt_id)) {
                    failuresByAttempt.set(failure.crawl_attempt_id, []);
                }
                failuresByAttempt.get(failure.crawl_attempt_id)!.push(failure);
            }

            // Add failures to attempts
            return attempts.map(attempt => ({
                ...attempt,
                failures: failuresByAttempt.get(attempt.id) || []
            }));
        }

        return attempts;
    }

    /**
     * Retry a failed crawl attempt
     */
    static async retryCrawlAttempt(attemptId: string, tenantId: string): Promise<string> {
        // Get the original attempt
        const originalResult = await query<CrawlAttempt>(
            `SELECT * FROM public.crawl_attempts WHERE id = $1 AND tenant_id = $2`,
            [attemptId, tenantId]
        );

        if (originalResult.rows.length === 0) {
            throw new Error('Crawl attempt not found');
        }

        const original = originalResult.rows[0];

        if (!original.can_retry) {
            throw new Error('This crawl attempt cannot be retried');
        }

        if (original.attempt_number >= original.max_retries) {
            throw new Error('Maximum retry attempts exceeded');
        }

        if (original.retry_after && new Date(original.retry_after) > new Date()) {
            throw new Error(`Cannot retry until ${original.retry_after}`);
        }

        // Create a new attempt
        const newAttemptId = await this.startCrawlAttempt({
            tenantId: original.tenant_id,
            siteId: original.site_id,
            sourceUrl: original.source_url,
            sourceType: original.source_type as 'url' | 'sitemap' | 'manual',
            parentJobId: original.parent_job_id,
            maxRetries: original.max_retries
        });

        return newAttemptId;
    }

    /**
     * Mark page failures as resolved
     */
    static async resolvePageFailures(
        failureIds: string[],
        tenantId: string,
        resolvedBy: string,
        notes?: string
    ): Promise<void> {
        await query(
            `UPDATE public.page_failures SET
                is_resolved = true,
                resolved_by = $3,
                resolution_notes = $4,
                resolved_at = now()
             WHERE id = ANY($1) AND tenant_id = $2 AND is_resolved = false`,
            [failureIds, tenantId, resolvedBy, notes]
        );
    }

    /**
     * Get failure statistics for dashboard
     */
    static async getFailureStats(tenantId: string, days = 30): Promise<{
        totalAttempts: number;
        successfulAttempts: number;
        failedAttempts: number;
        retryableFailures: number;
        commonErrorTypes: { error_type: string; count: number }[];
        recentFailures: number;
    }> {
        const stats = await query<{
            total_attempts: number;
            successful_attempts: number;
            failed_attempts: number;
            retryable_failures: number;
            recent_failures: number;
        }>(
            `SELECT 
                COUNT(*) as total_attempts,
                COUNT(*) FILTER (WHERE status = 'success') as successful_attempts,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_attempts,
                COUNT(*) FILTER (WHERE status = 'failed' AND can_retry = true AND attempt_number < max_retries) as retryable_failures,
                COUNT(*) FILTER (WHERE status = 'failed' AND created_at > now() - interval '24 hours') as recent_failures
             FROM public.crawl_attempts 
             WHERE tenant_id = $1 AND created_at > now() - interval '${days} days'`,
            [tenantId]
        );

        const errorTypes = await query<{ error_type: string; count: number }>(
            `SELECT error_type, COUNT(*) as count
             FROM public.crawl_attempts
             WHERE tenant_id = $1 AND status = 'failed' 
               AND created_at > now() - interval '${days} days'
               AND error_type IS NOT NULL
             GROUP BY error_type
             ORDER BY count DESC
             LIMIT 10`,
            [tenantId]
        );

        const row = stats.rows[0] || {};
        return {
            totalAttempts: Number(row.total_attempts) || 0,
            successfulAttempts: Number(row.successful_attempts) || 0,
            failedAttempts: Number(row.failed_attempts) || 0,
            retryableFailures: Number(row.retryable_failures) || 0,
            recentFailures: Number(row.recent_failures) || 0,
            commonErrorTypes: errorTypes.rows
        };
    }
}
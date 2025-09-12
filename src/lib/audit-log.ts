import { query } from '@/lib/db';

export type AuditAction =
    // API Key actions
    | 'api_key_created'
    | 'api_key_deleted'
    | 'api_key_rotated'
    | 'api_key_updated'

    // Team management actions
    | 'team_member_invited'
    | 'team_member_removed'
    | 'team_member_role_changed'
    | 'team_member_status_changed'
    | 'team_member_viewed'

    // Billing and plan actions
    | 'plan_changed'
    | 'billing_updated'
    | 'billing_portal_accessed'
    | 'subscription_created'
    | 'subscription_cancelled'

    // Security actions
    | 'unauthorized_access_attempt'
    | 'login_successful'
    | 'login_failed'
    | 'password_changed'

    // Integration actions
    | 'integration_added'
    | 'integration_removed'
    | 'integration_configured'
    | 'webhook_created'
    | 'webhook_deleted'

    // Content actions
    | 'document_ingested'
    | 'document_deleted'
    | 'conversation_exported'
    | 'data_exported'

    // Configuration actions
    | 'tenant_settings_changed'
    | 'escalation_rule_created'
    | 'escalation_rule_updated'
    | 'escalation_rule_deleted'

    // System actions
    | 'system_error'
    | 'rate_limit_exceeded'
    | 'feature_access_denied';

export interface AuditLogEntry {
    tenantId?: string; // Optional for system operations
    userId?: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    errorMessage?: string;
}

export interface AuditLogFilter {
    tenantId?: string;
    userId?: string;
    actions?: AuditAction[];
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: AuditLogEntry): Promise<void> {
    try {
        await query(
            `INSERT INTO public.audit_logs (
        tenant_id, user_id, action, resource_type, resource_id, 
        metadata, ip_address, user_agent, success, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
                params.tenantId || null, // Allow NULL for system operations
                params.userId || null,
                params.action,
                params.resourceType,
                params.resourceId || null,
                JSON.stringify(params.metadata || {}),
                params.ipAddress || null,
                params.userAgent || null,
                params.success !== false, // Default to true unless explicitly false
                params.errorMessage || null
            ]
        );
    } catch (error) {
        // Don't let audit logging failures break the main flow
        console.error('Failed to log audit event:', error, params);
    }
}

/**
 * Retrieve audit logs with filtering
 */
export async function getAuditLogs(filter: AuditLogFilter = {}) {
    try {
        let whereClause = 'WHERE 1=1';
        const params: unknown[] = [];
        let paramIndex = 1;

        if (filter.tenantId) {
            whereClause += ` AND tenant_id = $${paramIndex}`;
            params.push(filter.tenantId);
            paramIndex++;
        }

        if (filter.userId) {
            whereClause += ` AND user_id = $${paramIndex}`;
            params.push(filter.userId);
            paramIndex++;
        }

        if (filter.actions && filter.actions.length > 0) {
            whereClause += ` AND action = ANY($${paramIndex})`;
            params.push(filter.actions);
            paramIndex++;
        }

        if (filter.resourceType) {
            whereClause += ` AND resource_type = $${paramIndex}`;
            params.push(filter.resourceType);
            paramIndex++;
        }

        if (filter.resourceId) {
            whereClause += ` AND resource_id = $${paramIndex}`;
            params.push(filter.resourceId);
            paramIndex++;
        }

        if (filter.startDate) {
            whereClause += ` AND created_at >= $${paramIndex}`;
            params.push(filter.startDate);
            paramIndex++;
        }

        if (filter.endDate) {
            whereClause += ` AND created_at <= $${paramIndex}`;
            params.push(filter.endDate);
            paramIndex++;
        }

        const limit = Math.min(filter.limit || 100, 1000); // Max 1000 records
        const offset = filter.offset || 0;

        const result = await query<{
            id: string;
            tenant_id: string;
            user_id: string | null;
            action: AuditAction;
            resource_type: string;
            resource_id: string | null;
            metadata: string;
            ip_address: string | null;
            user_agent: string | null;
            success: boolean;
            error_message: string | null;
            created_at: string;
            user_email?: string;
            user_name?: string;
        }>(
            `SELECT 
        al.*,
        u.email as user_email,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name
      FROM public.audit_logs al
      LEFT JOIN public.users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        return result.rows.map(row => ({
            id: row.id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            action: row.action,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            metadata: JSON.parse(row.metadata || '{}'),
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            success: row.success,
            errorMessage: row.error_message,
            createdAt: row.created_at,
            userEmail: row.user_email,
            userName: row.user_name
        }));
    } catch (error) {
        console.error('Failed to retrieve audit logs:', error);
        throw new Error('Failed to retrieve audit logs');
    }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(tenantId: string, days = 30) {
    try {
        const result = await query<{
            action: AuditAction;
            count: number;
            success_rate: number;
        }>(
            `SELECT 
        action,
        COUNT(*)::int as count,
        ROUND(
          (COUNT(*) FILTER (WHERE success = true)::decimal / COUNT(*)) * 100, 
          2
        ) as success_rate
      FROM public.audit_logs 
      WHERE tenant_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC`,
            [tenantId]
        );

        return result.rows;
    } catch (error) {
        console.error('Failed to get audit stats:', error);
        throw new Error('Failed to get audit statistics');
    }
}

/**
 * Helper functions for common audit scenarios
 */

export async function logSecurityEvent(params: {
    tenantId: string;
    userId?: string;
    action: Extract<AuditAction, 'unauthorized_access_attempt' | 'login_successful' | 'login_failed'>;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
}) {
    await logAuditEvent({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        resourceType: 'security',
        metadata: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: params.action === 'login_successful'
    });
}

export async function logTeamEvent(params: {
    tenantId: string;
    userId?: string;
    action: Extract<AuditAction, 'team_member_invited' | 'team_member_removed' | 'team_member_role_changed'>;
    targetUserId: string;
    details?: Record<string, unknown>;
}) {
    await logAuditEvent({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        resourceType: 'team_member',
        resourceId: params.targetUserId,
        metadata: params.details
    });
}

export async function logApiKeyEvent(params: {
    tenantId: string;
    userId?: string;
    action: Extract<AuditAction, 'api_key_created' | 'api_key_deleted' | 'api_key_rotated' | 'api_key_updated'>;
    apiKeyId: string;
    details?: Record<string, unknown>;
}) {
    await logAuditEvent({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        resourceType: 'api_key',
        resourceId: params.apiKeyId,
        metadata: params.details
    });
}

export async function logBillingEvent(params: {
    tenantId: string;
    userId?: string;
    action: Extract<AuditAction, 'plan_changed' | 'billing_updated' | 'subscription_created' | 'subscription_cancelled'>;
    details?: Record<string, unknown>;
}) {
    await logAuditEvent({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        resourceType: 'billing',
        metadata: params.details
    });
}

export async function logIntegrationEvent(params: {
    tenantId: string;
    userId?: string;
    action: Extract<AuditAction, 'integration_added' | 'integration_removed' | 'integration_configured'>;
    integrationId: string;
    details?: Record<string, unknown>;
}) {
    await logAuditEvent({
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        resourceType: 'integration',
        resourceId: params.integrationId,
        metadata: params.details
    });
}

export async function logAccessDenied(params: {
    tenantId: string;
    userId?: string;
    feature?: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
    reason: string;
}) {
    await logAuditEvent({
        tenantId: params.tenantId,
        userId: params.userId,
        action: 'feature_access_denied',
        resourceType: 'access_control',
        metadata: {
            feature: params.feature,
            role: params.role,
            reason: params.reason
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        success: false,
        errorMessage: params.reason
    });
}

/**
 * Extract IP and User Agent from NextRequest
 */
export function extractRequestInfo(req: Request) {
    const ipAddress = req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    return { ipAddress, userAgent };
}

/**
 * Middleware helper to automatically log successful API calls
 */
export function withAuditLogging(
    action: AuditAction,
    resourceType: string,
    getResourceId?: (req: Request) => string | undefined
) {
    return async (req: Request, tenantId: string, userId?: string) => {
        const { ipAddress, userAgent } = extractRequestInfo(req);
        const resourceId = getResourceId?.(req);

        await logAuditEvent({
            tenantId,
            userId,
            action,
            resourceType,
            resourceId,
            ipAddress,
            userAgent,
            success: true
        });
    };
}

/**
 * Clean up old audit logs (for data retention)
 */
export async function cleanupAuditLogs(retentionDays = 365) {
    try {
        const result = await query(
            `DELETE FROM public.audit_logs 
       WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`,
            []
        );

        console.log(`Cleaned up ${result.rowCount} audit log entries older than ${retentionDays} days`);
        return result.rowCount || 0;
    } catch (error) {
        console.error('Failed to clean up audit logs:', error);
        throw new Error('Failed to clean up audit logs');
    }
}
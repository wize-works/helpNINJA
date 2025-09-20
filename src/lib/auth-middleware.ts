import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserRole, type UserRole } from '@/lib/rbac';
import { hasFeature, type PlanFeature } from '@/lib/plan-features';

export type AuthenticatedRequest = NextRequest & {
    tenantId: string;
    apiKey?: {
        id: string;
        name: string;
        key_type: 'public' | 'secret' | 'webhook';
        permissions: string[];
        tenant_id: string;
        rate_limit_per_hour: number;
    };
    userId?: string; // For session-based auth
};

export type AuthResult = {
    success: true;
    tenantId: string;
    apiKey?: {
        id: string;
        name: string;
        key_type: 'public' | 'secret' | 'webhook';
        permissions: string[];
        tenant_id: string;
        rate_limit_per_hour: number;
    };
    userId?: string;
} | {
    success: false;
    error: string;
    status: number;
};

/**
 * Extract API key from request headers
 */
function extractApiKey(req: NextRequest): string | null {
    // Check Authorization header with Bearer token
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = req.headers.get('x-api-key');
    if (apiKeyHeader) {
        return apiKeyHeader;
    }

    // Check query parameter (less secure, but useful for webhooks/testing)
    const url = new URL(req.url);
    const apiKeyParam = url.searchParams.get('api_key');
    if (apiKeyParam) {
        return apiKeyParam;
    }

    return null;
}

/**
 * Validate API key and return associated tenant/permissions
 */
async function validateApiKey(apiKey: string, req: NextRequest): Promise<AuthResult> {
    try {
        // Query the API key from database
        const { rows } = await query(`
      SELECT 
        ak.id,
        ak.name,
        ak.key_type,
        ak.permissions,
        ak.tenant_id,
        ak.rate_limit_per_hour,
        ak.last_used_at,
        ak.usage_count,
        ak.expires_at,
        t.plan_status as tenant_plan_status
      FROM public.api_keys ak
      JOIN public.tenants t ON t.id = ak.tenant_id
      WHERE ak.key_value = $1
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
    `, [apiKey]);

        if (rows.length === 0) {
            return {
                success: false,
                error: 'Invalid or expired API key',
                status: 401
            };
        }

        const keyData = rows[0];

        // Update last_used_at and usage_count
        await query(`
      UPDATE public.api_keys 
      SET last_used_at = NOW(), usage_count = usage_count + 1
      WHERE id = $1
    `, [keyData.id]);

        // Check rate limiting (basic implementation)
        const rateLimitWindow = new Date();
        rateLimitWindow.setHours(rateLimitWindow.getHours() - 1);

        const { rows: usageRows } = await query(`
      SELECT COUNT(*) as usage_count
      FROM public.api_usage_logs
      WHERE api_key_id = $1 AND created_at > $2
    `, [keyData.id, rateLimitWindow]);

        const currentUsage = parseInt(usageRows[0]?.usage_count || '0');
        if (currentUsage >= keyData.rate_limit_per_hour) {
            return {
                success: false,
                error: 'Rate limit exceeded',
                status: 429
            };
        }

        // Log API usage (we'll log it as successful since we're about to return success)
        await query(`
      INSERT INTO public.api_usage_logs (
        api_key_id, 
        tenant_id, 
        endpoint,
        method,
        status_code,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
            keyData.id,
            keyData.tenant_id,
            new URL(req.url).pathname,
            req.method,
            200, // We'll log as successful since validation passed
            req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1',
            req.headers.get('user-agent') || 'unknown'
        ]);

        return {
            success: true,
            tenantId: keyData.tenant_id,
            apiKey: {
                id: keyData.id,
                name: keyData.name,
                key_type: keyData.key_type,
                permissions: keyData.permissions,
                tenant_id: keyData.tenant_id,
                rate_limit_per_hour: keyData.rate_limit_per_hour
            }
        };
    } catch (error) {
        console.error('Error validating API key:', error);
        return {
            success: false,
            error: 'Authentication service error',
            status: 500
        };
    }
}

/**
 * Check if API key has required permission
 */
function hasPermission(apiKey: { permissions: string[] } | undefined, requiredPermission: string): boolean {
    if (!apiKey) return false;

    // Admin keys have all permissions
    if (apiKey.permissions.includes('admin')) {
        return true;
    }

    // Check specific permission
    return apiKey.permissions.includes(requiredPermission);
}

/**
 * Main authentication middleware
 */
export async function authenticateRequest(
    req: NextRequest,
    requiredPermissions: string[] = [],
    allowSessionAuth = true
): Promise<AuthResult> {
    // Try API key authentication first
    const apiKey = extractApiKey(req);

    if (apiKey) {
        const authResult = await validateApiKey(apiKey, req);

        if (!authResult.success) {
            return authResult;
        }

        // Check required permissions
        for (const permission of requiredPermissions) {
            if (!hasPermission(authResult.apiKey, permission)) {
                return {
                    success: false,
                    error: `Missing required permission: ${permission}`,
                    status: 403
                };
            }
        }

        return authResult;
    }

    // Fall back to session-based authentication if allowed
    if (allowSessionAuth) {
        try {
            // Use the real user resolver to get both userId and tenantId
            const { resolveUserAndTenant } = await import('@/lib/notifications');
            const { userId, tenantId } = await resolveUserAndTenant();

            return {
                success: true,
                tenantId,
                userId
            };
        } catch {
            return {
                success: false,
                error: 'Authentication required',
                status: 401
            };
        }
    }

    return {
        success: false,
        error: 'API key required',
        status: 401
    };
}

/**
 * Wrapper function to protect API routes
 */
export function withAuth(
    handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>,
    options: {
        requiredPermissions?: string[];
        allowSessionAuth?: boolean;
    } = {}
) {
    return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
        const authResult = await authenticateRequest(
            req,
            options.requiredPermissions || [],
            options.allowSessionAuth !== false
        );

        if (!authResult.success) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        // Augment request with auth info
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.tenantId = authResult.tenantId;
        authenticatedReq.apiKey = authResult.apiKey;
        authenticatedReq.userId = authResult.userId;

        return handler(authenticatedReq, ...args);
    };
}

/**
 * Middleware for specific permission checks
 */
export function requirePermissions(permissions: string[]) {
    return (
        handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>
    ) => withAuth(handler, { requiredPermissions: permissions });
}

/**
 * Middleware for API-key-only routes (no session fallback)
 */
export function requireApiKey(permissions: string[] = []) {
    return (
        handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>
    ) => withAuth(handler, {
        requiredPermissions: permissions,
        allowSessionAuth: false
    });
}

/**
 * Enhanced auth wrapper with role and feature checking
 */
export function withRoleAndFeatureAuth(
    handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>,
    options: {
        requiredPermissions?: string[];
        requiredRoles?: UserRole[];
        requiredFeatures?: PlanFeature[];
        allowSessionAuth?: boolean;
    } = {}
) {
    return async (req: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
        // First, handle basic authentication
        const authResult = await authenticateRequest(
            req,
            options.requiredPermissions || [],
            options.allowSessionAuth !== false
        );

        if (!authResult.success) {
            return NextResponse.json(
                { error: authResult.error },
                { status: authResult.status }
            );
        }

        const { tenantId, userId } = authResult;

        // Check role requirements if specified and we have a userId
        if (options.requiredRoles && userId) {
            try {
                const userRole = await getUserRole(userId, tenantId);
                if (!userRole || !options.requiredRoles.includes(userRole)) {
                    return NextResponse.json(
                        {
                            error: 'Insufficient role permissions',
                            details: {
                                required: options.requiredRoles,
                                current: userRole || 'none'
                            }
                        },
                        { status: 403 }
                    );
                }
            } catch (error) {
                console.error('Role check error:', error);
                return NextResponse.json(
                    { error: 'Role verification failed' },
                    { status: 500 }
                );
            }
        }

        // Check feature requirements if specified
        if (options.requiredFeatures) {
            try {
                for (const feature of options.requiredFeatures) {
                    const featureCheck = await hasFeature(tenantId, feature);
                    if (!featureCheck.hasAccess) {
                        return NextResponse.json(
                            {
                                error: 'Feature not available',
                                details: {
                                    feature,
                                    currentPlan: featureCheck.currentPlan,
                                    suggestedPlan: featureCheck.suggestedPlan,
                                    reason: featureCheck.reason
                                }
                            },
                            { status: 402 } // Payment required
                        );
                    }
                }
            } catch (error) {
                console.error('Feature check error:', error);
                return NextResponse.json(
                    { error: 'Feature verification failed' },
                    { status: 500 }
                );
            }
        }

        // Augment request with auth info
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.tenantId = tenantId;
        authenticatedReq.apiKey = authResult.apiKey;
        authenticatedReq.userId = userId;

        return handler(authenticatedReq, ...args);
    };
}

/**
 * Middleware requiring specific roles
 */
export function requireRoles(roles: UserRole[]) {
    return (
        handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>
    ) => withRoleAndFeatureAuth(handler, {
        requiredRoles: roles,
        allowSessionAuth: true
    });
}

/**
 * Middleware requiring specific plan features
 */
export function requireFeatures(features: PlanFeature[]) {
    return (
        handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>
    ) => withRoleAndFeatureAuth(handler, {
        requiredFeatures: features
    });
}

/**
 * Middleware requiring both roles and features
 */
export function requireRolesAndFeatures(roles: UserRole[], features: PlanFeature[]) {
    return (
        handler: (req: AuthenticatedRequest, ...args: unknown[]) => Promise<NextResponse>
    ) => withRoleAndFeatureAuth(handler, {
        requiredRoles: roles,
        requiredFeatures: features,
        allowSessionAuth: true
    });
}

/**
 * Convenience middleware for admin-only routes
 */
export function requireAdmin() {
    return requireRoles(['owner', 'admin']);
}

/**
 * Convenience middleware for owner-only routes
 */
export function requireOwner() {
    return requireRoles(['owner']);
}

import { query } from '@/lib/db';
import { type Role } from '@/lib/permissions';

// Use the unified role type from permissions.ts
export type UserRole = Role;

export interface RoleCheckResult {
    hasAccess: boolean;
    userRole: UserRole | null;
    reason?: string;
}

/**
 * Get the role of a user within a specific tenant
 */
export async function getUserRole(userId: string, tenantId: string): Promise<UserRole | null> {
    try {
        const result = await query<{ role: UserRole }>(
            `SELECT role FROM public.tenant_members 
       WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'`,
            [userId, tenantId]
        );

        return result.rows[0]?.role || null;
    } catch (error) {
        console.error('Error fetching user role:', error);
        return null;
    }
}

/**
 * Check if a user has any of the required roles for a tenant
 */
export async function hasRole(
    userId: string,
    tenantId: string,
    allowedRoles: UserRole[]
): Promise<RoleCheckResult> {
    if (!userId) {
        return { hasAccess: false, userRole: null, reason: 'User authentication required' };
    }

    const userRole = await getUserRole(userId, tenantId);

    if (!userRole) {
        return { hasAccess: false, userRole: null, reason: 'User not found in tenant or inactive' };
    }

    const hasAccess = allowedRoles.includes(userRole);

    return {
        hasAccess,
        userRole,
        reason: hasAccess ? undefined : `Role '${userRole}' not in allowed roles: ${allowedRoles.join(', ')}`
    };
}

/**
 * Role hierarchy - check if user role has sufficient permissions
 * owner > admin > analyst > support > viewer
 */
export function roleHierarchyCheck(userRole: UserRole, minimumRole: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
        owner: 5,
        admin: 4,
        analyst: 3,
        support: 2,
        viewer: 1
    };

    return hierarchy[userRole] >= hierarchy[minimumRole];
}

/**
 * Check if user has minimum role level
 */
export async function hasMinimumRole(
    userId: string,
    tenantId: string,
    minimumRole: UserRole
): Promise<RoleCheckResult> {
    const roleResult = await hasRole(userId, tenantId, ['owner', 'admin', 'analyst', 'support', 'viewer']);

    if (!roleResult.hasAccess || !roleResult.userRole) {
        return roleResult;
    }

    const hasAccess = roleHierarchyCheck(roleResult.userRole, minimumRole);

    return {
        hasAccess,
        userRole: roleResult.userRole,
        reason: hasAccess ? undefined : `Role '${roleResult.userRole}' below minimum required role '${minimumRole}'`
    };
}

/**
 * Middleware function to require specific roles
 */
export function requireRoles(allowedRoles: UserRole[]) {
    return async (userId: string, tenantId: string): Promise<void> => {
        const result = await hasRole(userId, tenantId, allowedRoles);

        if (!result.hasAccess) {
            throw new Error(result.reason || 'Insufficient role permissions');
        }
    };
}

/**
 * Middleware function to require minimum role level
 */
export function requireMinimumRole(minimumRole: UserRole) {
    return async (userId: string, tenantId: string): Promise<void> => {
        const result = await hasMinimumRole(userId, tenantId, minimumRole);

        if (!result.hasAccess) {
            throw new Error(result.reason || 'Insufficient role permissions');
        }
    };
}

/**
 * Get all team members for a tenant with their roles
 */
export async function getTeamMembers(tenantId: string) {
    try {
        const result = await query<{
            user_id: string;
            role: UserRole;
            status: string;
            invited_at: string;
            joined_at: string | null;
            last_active_at: string | null;
            email: string;
            first_name: string | null;
            last_name: string | null;
            avatar_url: string | null;
        }>(
            `SELECT 
        tm.user_id,
        tm.role,
        tm.status,
        tm.invited_at,
        tm.joined_at,
        tm.last_active_at,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url
      FROM public.tenant_members tm
      JOIN public.users u ON u.id = tm.user_id
      WHERE tm.tenant_id = $1
      ORDER BY 
        CASE tm.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'analyst' THEN 3 
          WHEN 'support' THEN 4 
          WHEN 'viewer' THEN 5 
        END,
        tm.joined_at ASC`,
            [tenantId]
        );

        return result.rows;
    } catch (error) {
        console.error('Error fetching team members:', error);
        throw new Error('Failed to fetch team members');
    }
}

/**
 * Check if user can manage another user (based on role hierarchy)
 */
export async function canManageUser(
    managerId: string,
    targetUserId: string,
    tenantId: string
): Promise<{ canManage: boolean; reason?: string }> {
    const [managerRole, targetRole] = await Promise.all([
        getUserRole(managerId, tenantId),
        getUserRole(targetUserId, tenantId)
    ]);

    if (!managerRole) {
        return { canManage: false, reason: 'Manager not found in tenant' };
    }

    if (!targetRole) {
        return { canManage: false, reason: 'Target user not found in tenant' };
    }

    // Owners can manage everyone except other owners
    if (managerRole === 'owner' && targetRole !== 'owner') {
        return { canManage: true };
    }

    // Admins can manage analyst, support, viewer (but not other admins or owners)
    if (managerRole === 'admin' && ['analyst', 'support', 'viewer'].includes(targetRole)) {
        return { canManage: true };
    }

    // Analysts can manage support and viewer (if needed)
    if (managerRole === 'analyst' && ['support', 'viewer'].includes(targetRole)) {
        return { canManage: true };
    }

    // Support and viewer cannot manage anyone
    if (['support', 'viewer'].includes(managerRole)) {
        return { canManage: false, reason: `Role '${managerRole}' cannot manage other users` };
    }

    return {
        canManage: false,
        reason: `Role '${managerRole}' cannot manage role '${targetRole}'`
    };
}

/**
 * Role-based feature matrix - aligned with permissions.ts
 */
export const ROLE_PERMISSIONS = {
    owner: [
        'team.manage',
        'billing.manage',
        'api_keys.manage',
        'integrations.manage',
        'webhooks.manage',
        'analytics.advanced',
        'data.export',
        'tenant.configure'
    ],
    admin: [
        'team.view',
        'team.invite',
        'api_keys.create',
        'api_keys.rotate',
        'integrations.configure',
        'webhooks.configure',
        'analytics.view',
        'conversations.manage'
    ],
    analyst: [
        'team.view',
        'analytics.view',
        'data.export',
        'conversations.view',
        'documents.view'
    ],
    support: [
        'team.view',
        'conversations.manage',
        'conversations.view',
        'analytics.basic',
        'documents.view'
    ],
    viewer: [
        'team.view',
        'analytics.basic',
        'conversations.view',
        'documents.view'
    ]
} as const;

export type RolePermission =
    | 'team.manage' | 'team.view' | 'team.invite'
    | 'billing.manage'
    | 'api_keys.manage' | 'api_keys.create' | 'api_keys.rotate'
    | 'integrations.manage' | 'integrations.configure'
    | 'webhooks.manage' | 'webhooks.configure'
    | 'analytics.advanced' | 'analytics.view' | 'analytics.basic'
    | 'data.export'
    | 'tenant.configure'
    | 'conversations.manage' | 'conversations.view'
    | 'documents.view';

/**
 * Check if role has specific permission
 */
export function hasPermission(role: UserRole, permission: RolePermission): boolean {
    return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): readonly string[] {
    return ROLE_PERMISSIONS[role];
}
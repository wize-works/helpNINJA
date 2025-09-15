import { query } from '@/lib/db';
import { type Role } from '@/lib/permissions';
import {
    getAssignableRoles,
    canAssignRole,
    canModifyRole as canModifyRoleBasic
} from '@/lib/role-utils';

export interface TeamPermissionResult {
    allowed: boolean;
    reason?: string;
    maxRole?: Role;
}

// Re-export client-safe utilities
export { getAssignableRoles, isRoleHigher, getHighestAssignableRole } from '@/lib/role-utils';

/**
 * Check if a user can invite someone with a specific role
 */
export async function canInviteUserWithRole(
    currentUserId: string,
    tenantId: string,
    targetRole: Role
): Promise<TeamPermissionResult> {
    try {
        // Get current user's role in the tenant
        const userRoleResult = await query(
            'SELECT role FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = $3',
            [tenantId, currentUserId, 'active']
        );

        if (userRoleResult.rows.length === 0) {
            return {
                allowed: false,
                reason: 'You are not a member of this organization'
            };
        }

        const currentRole = userRoleResult.rows[0].role as Role;

        // Check if current role can assign the target role
        if (!canAssignRole(currentRole, targetRole)) {
            const assignableRoles = getAssignableRoles(currentRole);
            return {
                allowed: false,
                reason: `Your role (${currentRole}) cannot invite users with role: ${targetRole}`,
                maxRole: assignableRoles.length > 0 ? assignableRoles[0] : undefined
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking invite permissions:', error);
        return {
            allowed: false,
            reason: 'Failed to verify permissions'
        };
    }
}

/**
 * Check if a user can modify another user's role
 */
export async function canModifyUserRole(
    currentUserId: string,
    tenantId: string,
    targetUserId: string,
    newRole: Role
): Promise<TeamPermissionResult> {
    try {
        // Get both users' current roles
        const [currentUserResult, targetUserResult] = await Promise.all([
            query(
                'SELECT role FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = $3',
                [tenantId, currentUserId, 'active']
            ),
            query(
                'SELECT role FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2',
                [tenantId, targetUserId]
            )
        ]);

        if (currentUserResult.rows.length === 0) {
            return {
                allowed: false,
                reason: 'You are not a member of this organization'
            };
        }

        if (targetUserResult.rows.length === 0) {
            return {
                allowed: false,
                reason: 'Target user is not a member of this organization'
            };
        }

        const currentRole = currentUserResult.rows[0].role as Role;
        const targetCurrentRole = targetUserResult.rows[0].role as Role;

        // Cannot modify yourself (should be handled at UI level too)
        if (currentUserId === targetUserId) {
            return {
                allowed: false,
                reason: 'You cannot modify your own role'
            };
        }

        // Cannot modify someone with equal or higher role
        if (!canModifyRoleBasic(currentRole, targetCurrentRole)) {
            return {
                allowed: false,
                reason: `You cannot modify users with role: ${targetCurrentRole}`
            };
        }

        // Cannot assign a role higher than what you can assign
        if (!canAssignRole(currentRole, newRole)) {
            const assignableRoles = getAssignableRoles(currentRole);
            return {
                allowed: false,
                reason: `Your role (${currentRole}) cannot assign role: ${newRole}`,
                maxRole: assignableRoles.length > 0 ? assignableRoles[0] : undefined
            };
        }

        // Special protection for owner role
        if (targetCurrentRole === 'owner') {
            return {
                allowed: false,
                reason: 'Owner role cannot be modified'
            };
        }

        if (newRole === 'owner') {
            return {
                allowed: false,
                reason: 'Cannot assign owner role'
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking role modification permissions:', error);
        return {
            allowed: false,
            reason: 'Failed to verify permissions'
        };
    }
}

/**
 * Check if a user can remove another user from the team
 */
export async function canRemoveUser(
    currentUserId: string,
    tenantId: string,
    targetUserId: string
): Promise<TeamPermissionResult> {
    try {
        // Get both users' current roles
        const [currentUserResult, targetUserResult] = await Promise.all([
            query(
                'SELECT role FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2 AND status = $3',
                [tenantId, currentUserId, 'active']
            ),
            query(
                'SELECT role FROM public.tenant_members WHERE tenant_id = $1 AND user_id = $2',
                [tenantId, targetUserId]
            )
        ]);

        if (currentUserResult.rows.length === 0) {
            return {
                allowed: false,
                reason: 'You are not a member of this organization'
            };
        }

        if (targetUserResult.rows.length === 0) {
            return {
                allowed: false,
                reason: 'Target user is not a member of this organization'
            };
        }

        const currentRole = currentUserResult.rows[0].role as Role;
        const targetRole = targetUserResult.rows[0].role as Role;

        // Cannot remove yourself
        if (currentUserId === targetUserId) {
            return {
                allowed: false,
                reason: 'You cannot remove yourself from the team'
            };
        }

        // Cannot remove someone with equal or higher role
        if (!canModifyRoleBasic(currentRole, targetRole)) {
            return {
                allowed: false,
                reason: `You cannot remove users with role: ${targetRole}`
            };
        }

        // Special protection for owner role
        if (targetRole === 'owner') {
            return {
                allowed: false,
                reason: 'Cannot remove owner from team'
            };
        }

        // Check if this would leave the team without admins (if removing an admin)
        if (targetRole === 'admin') {
            const adminCount = await query(
                'SELECT COUNT(*) as count FROM public.tenant_members WHERE tenant_id = $1 AND role IN ($2, $3) AND status = $4',
                [tenantId, 'owner', 'admin', 'active']
            );

            if (parseInt(adminCount.rows[0].count) <= 1) {
                return {
                    allowed: false,
                    reason: 'Cannot remove the last admin from the team'
                };
            }
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking removal permissions:', error);
        return {
            allowed: false,
            reason: 'Failed to verify permissions'
        };
    }
}
import { type Role } from '@/lib/permissions';

/**
 * Role hierarchy for team management permissions
 * Higher number = higher privilege level
 */
const ROLE_HIERARCHY: Record<Role, number> = {
    'viewer': 1,
    'support': 2,
    'analyst': 3,
    'admin': 4,
    'owner': 5
};

/**
 * Defines what roles each role can assign to others
 */
const ASSIGNABLE_ROLES: Record<Role, Role[]> = {
    'owner': ['admin', 'analyst', 'support', 'viewer'],
    'admin': ['analyst', 'support', 'viewer'],
    'analyst': ['support', 'viewer'],
    'support': ['viewer'],
    'viewer': []
};

/**
 * Get roles that a user can assign to others
 */
export function getAssignableRoles(currentRole: Role): Role[] {
    return ASSIGNABLE_ROLES[currentRole] || [];
}

/**
 * Check if a role is higher than another role
 */
export function isRoleHigher(role1: Role, role2: Role): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get the highest assignable role for a given role
 */
export function getHighestAssignableRole(currentRole: Role): Role | null {
    const assignable = ASSIGNABLE_ROLES[currentRole] || [];
    if (assignable.length === 0) return null;

    return assignable.reduce((highest, role) =>
        isRoleHigher(role, highest) ? role : highest
    );
}

/**
 * Get the role hierarchy level for a role
 */
export function getRoleLevel(role: Role): number {
    return ROLE_HIERARCHY[role];
}

/**
 * Check if a user with currentRole can assign targetRole
 */
export function canAssignRole(currentRole: Role, targetRole: Role): boolean {
    return getAssignableRoles(currentRole).includes(targetRole);
}

/**
 * Check if a user with currentRole can modify someone with targetRole
 */
export function canModifyRole(currentRole: Role, targetRole: Role): boolean {
    // Cannot modify someone with equal or higher role
    return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[currentRole];
}
/**
 * Role-based permission system for team management
 */

export type Role = 'owner' | 'admin' | 'analyst' | 'support' | 'viewer';

export type Permission = 
    | 'tenant.manage'
    | 'users.manage'
    | 'sites.manage'
    | 'sites.view'
    | 'content.manage'
    | 'content.view'
    | 'rules.manage'
    | 'rules.view'
    | 'integrations.manage'
    | 'integrations.view'
    | 'analytics.view'
    | 'conversations.manage'
    | 'conversations.view'
    | 'billing.manage'
    | 'billing.view';

export type UserMember = {
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role: Role;
    status: 'pending' | 'active' | 'suspended';
    invited_by?: string;
    invited_at?: string;
    joined_at?: string;
    last_active_at?: string;
};

// Role hierarchy for permission inheritance
const ROLE_HIERARCHY: Record<Role, Role[]> = {
    owner: ['owner', 'admin', 'analyst', 'support', 'viewer'],
    admin: ['admin', 'analyst', 'support', 'viewer'],
    analyst: ['analyst'],
    support: ['support'],
    viewer: ['viewer']
};

// Permission mappings for each role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    owner: [
        'tenant.manage',
        'users.manage',
        'sites.manage',
        'content.manage',
        'rules.manage',
        'integrations.manage',
        'analytics.view',
        'conversations.manage',
        'billing.manage'
    ],
    admin: [
        'users.manage',
        'sites.manage',
        'content.manage',
        'rules.manage',
        'integrations.manage',
        'analytics.view',
        'conversations.manage'
    ],
    analyst: [
        'sites.view',
        'content.manage',
        'rules.manage',
        'analytics.view',
        'conversations.view'
    ],
    support: [
        'sites.view',
        'content.view',
        'conversations.manage',
        'analytics.view'
    ],
    viewer: [
        'sites.view',
        'content.view',
        'conversations.view',
        'analytics.view'
    ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a role can perform actions of another role
 */
export function canActAsRole(userRole: Role, targetRole: Role): boolean {
    return ROLE_HIERARCHY[userRole]?.includes(targetRole) || false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get role display information
 */
export function getRoleInfo(role: Role) {
    const roleInfo = {
        owner: {
            label: 'Owner',
            description: 'Full access to all features including billing and team management',
            color: 'error',
            icon: 'fa-crown'
        },
        admin: {
            label: 'Admin',
            description: 'Manage all features except billing and tenant settings',
            color: 'primary',
            icon: 'fa-user-tie'
        },
        analyst: {
            label: 'Analyst',
            description: 'Manage content, rules, and view analytics',
            color: 'secondary',
            icon: 'fa-chart-line'
        },
        support: {
            label: 'Support',
            description: 'Handle conversations and view content',
            color: 'accent',
            icon: 'fa-headset'
        },
        viewer: {
            label: 'Viewer',
            description: 'Read-only access to conversations and analytics',
            color: 'success',
            icon: 'fa-eye'
        }
    };
    
    return roleInfo[role];
}

/**
 * Get available roles that a user can assign (based on their own role)
 */
export function getAssignableRoles(userRole: Role): Role[] {
    switch (userRole) {
        case 'owner':
            return ['admin', 'analyst', 'support', 'viewer']; // Can assign any role except owner
        case 'admin':
            return ['analyst', 'support', 'viewer']; // Cannot assign admin or owner
        default:
            return []; // Other roles cannot assign roles
    }
}

/**
 * Check if user can manage another user based on roles
 */
export function canManageUser(managerRole: Role, targetRole: Role): boolean {
    // Owner can manage everyone except other owners
    if (managerRole === 'owner' && targetRole !== 'owner') return true;
    
    // Admin can manage analyst, support, viewer
    if (managerRole === 'admin' && ['analyst', 'support', 'viewer'].includes(targetRole)) return true;
    
    return false;
}

/**
 * Get permission requirements for different features
 */
export function getFeaturePermissions() {
    return {
        dashboard: ['analytics.view'],
        sites: {
            view: ['sites.view'],
            manage: ['sites.manage']
        },
        documents: {
            view: ['content.view'],
            manage: ['content.manage']
        },
        sources: {
            view: ['content.view'],
            manage: ['content.manage']
        },
        answers: {
            view: ['content.view'],
            manage: ['content.manage']
        },
        conversations: {
            view: ['conversations.view'],
            manage: ['conversations.manage']
        },
        rules: {
            view: ['rules.view'],
            manage: ['rules.manage']
        },
        integrations: {
            view: ['integrations.view'],
            manage: ['integrations.manage']
        },
        analytics: {
            view: ['analytics.view']
        },
        team: {
            view: ['users.manage'],
            manage: ['users.manage']
        },
        billing: {
            view: ['billing.view'],
            manage: ['billing.manage']
        },
        settings: {
            view: ['sites.view'],
            manage: ['tenant.manage']
        }
    };
}

/**
 * Validate if a user can access a specific route based on permissions
 */
export function canAccessRoute(role: Role, route: string): boolean {
    const permissions = getFeaturePermissions();
    
    // Map routes to required permissions
    const routePermissions: Record<string, Permission[]> = {
        '/dashboard': permissions.dashboard,
        '/dashboard/sites': permissions.sites.view,
        '/dashboard/documents': permissions.documents.view,
        '/dashboard/sources': permissions.sources.view,
        '/dashboard/answers': permissions.answers.view,
        '/dashboard/conversations': permissions.conversations.view,
        '/dashboard/rules': permissions.rules.view,
        '/dashboard/integrations': permissions.integrations.view,
        '/dashboard/analytics': permissions.analytics.view,
        '/dashboard/team': permissions.team.view,
        '/dashboard/billing': permissions.billing.view,
        '/dashboard/settings': permissions.settings.view
    };
    
    const requiredPermissions = routePermissions[route];
    if (!requiredPermissions) return true; // No specific permissions required
    
    return requiredPermissions.some(permission => hasPermission(role, permission));
}

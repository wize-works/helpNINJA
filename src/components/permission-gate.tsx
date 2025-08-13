"use client";

import { ReactNode } from 'react';
import { hasPermission, canAccessRoute, type Role, type Permission } from '@/lib/permissions';

interface PermissionGateProps {
    userRole: Role;
    requiredPermission?: Permission;
    requiredRoute?: string;
    children: ReactNode;
    fallback?: ReactNode;
    hideIfDenied?: boolean;
}

export default function PermissionGate({
    userRole,
    requiredPermission,
    requiredRoute,
    children,
    fallback,
    hideIfDenied = false
}: PermissionGateProps) {
    let hasAccess = true;
    
    if (requiredPermission) {
        hasAccess = hasPermission(userRole, requiredPermission);
    }
    
    if (requiredRoute && hasAccess) {
        hasAccess = canAccessRoute(userRole, requiredRoute);
    }
    
    if (!hasAccess) {
        if (hideIfDenied) {
            return null;
        }
        
        if (fallback) {
            return <>{fallback}</>;
        }
        
        return (
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body text-center py-12">
                    <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i className="fa-duotone fa-solid fa-lock text-2xl text-base-content/40" aria-hidden />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Access Restricted</h3>
                    <p className="text-base-content/60 mb-4">
                        You don&apos;t have permission to access this feature.
                    </p>
                    <p className="text-sm text-base-content/50">
                        Contact your team administrator to request access.
                    </p>
                </div>
            </div>
        );
    }
    
    return <>{children}</>;
}

// Convenience wrapper for common permission checks
export function CanManageContent({ userRole, children, fallback, hideIfDenied = false }: {
    userRole: Role;
    children: ReactNode;
    fallback?: ReactNode;
    hideIfDenied?: boolean;
}) {
    return (
        <PermissionGate
            userRole={userRole}
            requiredPermission="content.manage"
            fallback={fallback}
            hideIfDenied={hideIfDenied}
        >
            {children}
        </PermissionGate>
    );
}

export function CanManageTeam({ userRole, children, fallback, hideIfDenied = false }: {
    userRole: Role;
    children: ReactNode;
    fallback?: ReactNode;
    hideIfDenied?: boolean;
}) {
    return (
        <PermissionGate
            userRole={userRole}
            requiredPermission="users.manage"
            fallback={fallback}
            hideIfDenied={hideIfDenied}
        >
            {children}
        </PermissionGate>
    );
}

export function CanManageRules({ userRole, children, fallback, hideIfDenied = false }: {
    userRole: Role;
    children: ReactNode;
    fallback?: ReactNode;
    hideIfDenied?: boolean;
}) {
    return (
        <PermissionGate
            userRole={userRole}
            requiredPermission="rules.manage"
            fallback={fallback}
            hideIfDenied={hideIfDenied}
        >
            {children}
        </PermissionGate>
    );
}

export function CanManageIntegrations({ userRole, children, fallback, hideIfDenied = false }: {
    userRole: Role;
    children: ReactNode;
    fallback?: ReactNode;
    hideIfDenied?: boolean;
}) {
    return (
        <PermissionGate
            userRole={userRole}
            requiredPermission="integrations.manage"
            fallback={fallback}
            hideIfDenied={hideIfDenied}
        >
            {children}
        </PermissionGate>
    );
}

export function CanViewAnalytics({ userRole, children, fallback, hideIfDenied = false }: {
    userRole: Role;
    children: ReactNode;
    fallback?: ReactNode;
    hideIfDenied?: boolean;
}) {
    return (
        <PermissionGate
            userRole={userRole}
            requiredPermission="analytics.view"
            fallback={fallback}
            hideIfDenied={hideIfDenied}
        >
            {children}
        </PermissionGate>
    );
}

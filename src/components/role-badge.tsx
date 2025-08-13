"use client";

import { getRoleInfo, type Role } from '@/lib/permissions';

interface RoleBadgeProps {
    role: Role;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export default function RoleBadge({ role, size = 'md', showIcon = true }: RoleBadgeProps) {
    const roleInfo = getRoleInfo(role);
    
    const sizeClasses = {
        sm: 'badge-sm text-xs',
        md: 'text-sm',
        lg: 'badge-lg text-base'
    };
    
    const colorClasses = {
        error: 'badge-error',
        primary: 'badge-primary', 
        secondary: 'badge-secondary',
        accent: 'badge-accent',
        neutral: 'badge-neutral'
    };
    
    return (
        <div className={`badge ${colorClasses[roleInfo.color as keyof typeof colorClasses]} ${sizeClasses[size]} gap-1`}>
            {showIcon && (
                <i className={`fa-duotone fa-solid ${roleInfo.icon}`} aria-hidden />
            )}
            <span>{roleInfo.label}</span>
        </div>
    );
}

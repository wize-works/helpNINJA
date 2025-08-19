"use client";

import { useState } from 'react';
import Image from 'next/image';
import { UserMember, getRoleInfo, getAssignableRoles, canManageUser, type Role } from '@/lib/permissions';
import RoleBadge from './role-badge';
import { HoverScale } from './ui/animated-page';

interface TeamMemberCardProps {
    member: UserMember;
    currentUserRole: Role;
    onEdit: (member: UserMember) => void;
    onRemove: (member: UserMember) => void;
    onRoleChange: (member: UserMember, newRole: Role) => void;
    onStatusChange: (member: UserMember, newStatus: 'active' | 'suspended') => void;
}

export default function TeamMemberCard({
    member,
    currentUserRole,
    onEdit,
    onRemove,
    onRoleChange,
    onStatusChange
}: TeamMemberCardProps) {
    const [showActions, setShowActions] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const canManage = canManageUser(currentUserRole, member.role);
    const assignableRoles = getAssignableRoles(currentUserRole);
    const isOwner = member.role === 'owner';

    const getInitials = (firstName?: string, lastName?: string, email?: string) => {
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        if (firstName) {
            return firstName[0].toUpperCase();
        }
        if (email) {
            return email[0].toUpperCase();
        }
        return '?';
    };

    const getDisplayName = () => {
        if (member.first_name && member.last_name) {
            return `${member.first_name} ${member.last_name}`;
        }
        if (member.first_name) {
            return member.first_name;
        }
        return member.email;
    };

    const getLastActiveText = () => {
        if (!member.last_active_at) {
            return member.status === 'pending' ? 'Invitation pending' : 'Never logged in';
        }

        const lastActive = new Date(member.last_active_at);
        const now = new Date();
        const diffInHours = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Active now';
        } else if (diffInHours < 24) {
            return `Active ${Math.floor(diffInHours)}h ago`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `Active ${diffInDays}d ago`;
        }
    };

    const handleRoleChange = async (newRole: Role) => {
        if (newRole === member.role || !canManage) return;

        setIsUpdating(true);
        try {
            await onRoleChange(member, newRole);
        } finally {
            setIsUpdating(false);
            setShowActions(false);
        }
    };

    const handleStatusToggle = async () => {
        if (!canManage) return;

        const newStatus = member.status === 'active' ? 'suspended' : 'active';
        setIsUpdating(true);
        try {
            await onStatusChange(member, newStatus);
        } finally {
            setIsUpdating(false);
            setShowActions(false);
        }
    };

    const handleRemove = () => {
        if (!canManage || isOwner) return;

        if (confirm(`Are you sure you want to remove ${getDisplayName()} from the team?`)) {
            onRemove(member);
        }
        setShowActions(false);
    };

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="card-body">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        {/* Avatar */}
                        <div className="avatar placeholder">
                            <div className={`w-12 h-12 rounded-xl ${member.status === 'suspended' ? 'bg-base-300' : 'bg-primary text-primary-content'}`}>
                                {member.avatar_url ? (
                                    <Image
                                        src={member.avatar_url}
                                        alt={getDisplayName()}
                                        width={48}
                                        height={48}
                                        className="rounded-xl"
                                    />
                                ) : (
                                    <span className="text-sm font-semibold">
                                        {getInitials(member.first_name, member.last_name, member.email)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Member Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base-content line-clamp-1">
                                    {getDisplayName()}
                                </h3>
                                {member.status === 'suspended' && (
                                    <div className="badge badge-error badge-sm">Suspended</div>
                                )}
                                {member.status === 'pending' && (
                                    <div className="badge badge-warning badge-sm">Pending</div>
                                )}
                            </div>

                            <div className="text-sm text-base-content/70 mb-2 line-clamp-1">
                                {member.email}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-base-content/60">
                                <RoleBadge role={member.role} size="sm" />
                                <span>•</span>
                                <span>{getLastActiveText()}</span>
                            </div>

                            {member.invited_by && member.invited_at && (
                                <div className="text-xs text-base-content/50 mt-1">
                                    Invited by {member.invited_by} on{' '}
                                    {new Date(member.invited_at).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {canManage && !isOwner && (
                            <div className="dropdown dropdown-end">
                                <HoverScale scale={1.05}>
                                    <button
                                        className="btn btn-ghost btn-sm btn-square rounded-lg"
                                        onClick={() => setShowActions(!showActions)}
                                        disabled={isUpdating}
                                    >
                                        <i className="fa-duotone fa-solid fa-ellipsis-vertical" aria-hidden />
                                    </button>
                                </HoverScale>

                                {showActions && (
                                    <div className="dropdown-content z-10 menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-300">
                                        {/* Role Change */}
                                        {assignableRoles.length > 0 && (
                                            <div className="menu-title">
                                                <span>Change Role</span>
                                            </div>
                                        )}
                                        {assignableRoles.map((role) => (
                                            <button
                                                key={role}
                                                className={`btn btn-ghost btn-sm justify-start rounded-lg ${member.role === role ? 'btn-active' : ''}`}
                                                onClick={() => handleRoleChange(role)}
                                                disabled={isUpdating}
                                            >
                                                <i className={`fa-duotone fa-solid ${getRoleInfo(role).icon} mr-2`} aria-hidden />
                                                {getRoleInfo(role).label}
                                            </button>
                                        ))}

                                        {assignableRoles.length > 0 && <div className="divider my-1"></div>}

                                        {/* Status Toggle */}
                                        <button
                                            className="btn btn-ghost btn-sm justify-start rounded-lg"
                                            onClick={handleStatusToggle}
                                            disabled={isUpdating}
                                        >
                                            <i className={`fa-duotone fa-solid ${member.status === 'active' ? 'fa-pause' : 'fa-play'} mr-2`} aria-hidden />
                                            {member.status === 'active' ? 'Suspend' : 'Activate'}
                                        </button>

                                        {/* Edit */}
                                        <button
                                            className="btn btn-ghost btn-sm justify-start rounded-lg"
                                            onClick={() => {
                                                onEdit(member);
                                                setShowActions(false);
                                            }}
                                            disabled={isUpdating}
                                        >
                                            <i className="fa-duotone fa-solid fa-edit mr-2" aria-hidden />
                                            Edit Profile
                                        </button>

                                        <div className="divider my-1"></div>

                                        {/* Remove */}
                                        <button
                                            className="btn btn-ghost btn-sm justify-start text-error rounded-lg"
                                            onClick={handleRemove}
                                            disabled={isUpdating}
                                        >
                                            <i className="fa-duotone fa-solid fa-trash mr-2" aria-hidden />
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {isOwner && (
                            <div className="tooltip" data-tip="Owner cannot be modified">
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-crown text-primary text-sm" aria-hidden />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

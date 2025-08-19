"use client";

import { useState, useEffect } from 'react';
import { useTenant } from '@/components/tenant-context';
import { type Role } from '@/lib/permissions';
import RoleBadge from './role-badge';
import { HoverScale } from './ui/animated-page';
import { toastUtils } from '@/lib/toast';

type Invitation = {
    id: string;
    email: string;
    role: Role;
    token: string;
    expires_at: string;
    accepted_at?: string;
    created_at: string;
    invited_by_name: string;
    is_expired: boolean;
};

interface TeamInvitationsProps {
    onInvitationCancelled?: () => void;
}

export default function TeamInvitations({ onInvitationCancelled }: TeamInvitationsProps) {
    const { tenantId } = useTenant();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadInvitations();
    }, [tenantId]);

    const loadInvitations = async () => {
        try {
            const response = await fetch('/api/team/invitations');

            if (response.ok) {
                const data = await response.json();
                setInvitations(data);
            }
        } catch (error) {
            console.error('Error loading invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    const cancelInvitation = async (invitationId: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) return;

        setCancelling(prev => new Set([...prev, invitationId]));

        try {
            const response = await fetch(`/api/team/invitations?id=${invitationId}`, { method: 'DELETE' });

            if (response.ok) {
                setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
                onInvitationCancelled?.();
                toastUtils.success('Invitation cancelled successfully');
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to cancel invitation');
            }
        } catch (error) {
            console.error('Error cancelling invitation:', error);
            toastUtils.error('Failed to cancel invitation');
        } finally {
            setCancelling(prev => {
                const newSet = new Set(prev);
                newSet.delete(invitationId);
                return newSet;
            });
        }
    };

    const copyInvitationLink = (token: string) => {
        // In a real implementation, this would be the actual invitation URL
        const invitationUrl = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(invitationUrl);
        toastUtils.copied('Invitation link');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysUntilExpiry = (expiresAt: string) => {
        const expiry = new Date(expiresAt);
        const now = new Date();
        const diffInDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffInDays;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 2 }, (_, i) => (
                    <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                ))}
            </div>
        );
    }

    if (invitations.length === 0) {
        return (
            <div className="text-center py-8 text-base-content/60">
                <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="fa-duotone fa-solid fa-envelope text-xl text-base-content/40" aria-hidden />
                </div>
                <p>No pending invitations</p>
                <p className="text-sm">Team members you invite will appear here until they accept</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {invitations.map((invitation) => {
                const daysLeft = getDaysUntilExpiry(invitation.expires_at);
                const isExpiring = daysLeft <= 1 && !invitation.is_expired;

                return (
                    <div
                        key={invitation.id}
                        className={`card bg-base-100 border transition-all ${invitation.is_expired
                            ? 'border-error/30 bg-error/5'
                            : isExpiring
                                ? 'border-warning/30 bg-warning/5'
                                : 'border-base-300'
                            }`}
                    >
                        <div className="card-body py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="avatar placeholder">
                                        <div className={`w-10 h-10 rounded-lg ${invitation.is_expired ? 'bg-base-300' : 'bg-primary/20 text-primary'}`}>
                                            <i className="fa-duotone fa-solid fa-envelope text-sm" aria-hidden />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-base-content line-clamp-1">
                                                {invitation.email}
                                            </span>
                                            <RoleBadge role={invitation.role} size="sm" />
                                            {invitation.is_expired && (
                                                <div className="badge badge-error badge-sm">Expired</div>
                                            )}
                                            {isExpiring && (
                                                <div className="badge badge-warning badge-sm">Expiring Soon</div>
                                            )}
                                        </div>

                                        <div className="text-xs text-base-content/60">
                                            Invited by {invitation.invited_by_name} • {formatDate(invitation.created_at)}
                                            {!invitation.is_expired && (
                                                <span className="ml-2">
                                                    • Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!invitation.is_expired && (
                                        <HoverScale scale={1.05}>
                                            <button
                                                className="btn btn-ghost btn-sm rounded-lg"
                                                onClick={() => copyInvitationLink(invitation.token)}
                                                title="Copy invitation link"
                                            >
                                                <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                                            </button>
                                        </HoverScale>
                                    )}

                                    <HoverScale scale={1.05}>
                                        <button
                                            className={`btn btn-ghost btn-sm text-error rounded-lg ${cancelling.has(invitation.id) ? 'loading' : ''}`}
                                            onClick={() => cancelInvitation(invitation.id)}
                                            disabled={cancelling.has(invitation.id)}
                                            title="Cancel invitation"
                                        >
                                            <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

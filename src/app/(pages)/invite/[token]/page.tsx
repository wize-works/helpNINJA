"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HoverScale } from '@/components/ui/animated-page';
import { toastUtils } from '@/lib/toast';

type InvitationData = {
    id: string;
    email: string;
    role: string;
    tenant_name: string;
    invited_by: string;
    expires_at: string;
};

type InvitationStatus = 'loading' | 'valid' | 'not_found' | 'expired' | 'already_accepted' | 'error';

export default function InvitationPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [status, setStatus] = useState<InvitationStatus>('loading');
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: ''
    });

    useEffect(() => {
        const fetchInvitation = async () => {
            try {
                const response = await fetch(`/api/invitations/${token}`);
                const data = await response.json();

                if (response.ok) {
                    setInvitation(data.invitation);
                    setStatus('valid');
                } else {
                    switch (data.code) {
                        case 'INVITATION_NOT_FOUND':
                            setStatus('not_found');
                            break;
                        case 'EXPIRED':
                            setStatus('expired');
                            break;
                        case 'ALREADY_ACCEPTED':
                            setStatus('already_accepted');
                            break;
                        default:
                            setStatus('error');
                    }
                }
            } catch (error) {
                console.error('Error fetching invitation:', error);
                setStatus('error');
            }
        };

        if (token) {
            fetchInvitation();
        }
    }, [token]);

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitation) return;

        setAccepting(true);
        try {
            const response = await fetch(`/api/invitations/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName.trim() || undefined,
                    lastName: formData.lastName.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toastUtils.success('Welcome to the team! Redirecting to dashboard...');
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                toastUtils.apiError(data, 'Failed to accept invitation');
            }
        } catch (error) {
            console.error('Error accepting invitation:', error);
            toastUtils.error('Failed to accept invitation');
        } finally {
            setAccepting(false);
        }
    };

    const getRoleDescription = (role: string) => {
        const descriptions = {
            admin: 'Full access to manage team members, integrations, settings, and all dashboard features.',
            analyst: 'Access to analytics, conversations, and documents. Can view team and integration settings.',
            support: 'Access to conversations, escalations, and customer support features. Limited settings access.',
            viewer: 'Read-only access to dashboard analytics and conversation history. Cannot modify settings.',
        };
        return descriptions[role as keyof typeof descriptions] || 'Team member with access to dashboard features.';
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex items-center justify-center p-4">
                <div className="card bg-base-100 shadow-xl rounded-2xl max-w-md w-full">
                    <div className="card-body text-center">
                        <div className="loading loading-spinner loading-lg mx-auto mb-4"></div>
                        <p>Loading invitation...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (status !== 'valid' || !invitation) {
        const statusMessages = {
            not_found: {
                title: 'Invitation Not Found',
                message: 'This invitation link is invalid or has been removed.',
                icon: 'fa-solid fa-question-circle',
                color: 'text-error'
            },
            expired: {
                title: 'Invitation Expired',
                message: 'This invitation has expired. Please contact the team admin for a new invitation.',
                icon: 'fa-solid fa-clock',
                color: 'text-warning'
            },
            already_accepted: {
                title: 'Already Accepted',
                message: 'This invitation has already been accepted. You should already have access to the team.',
                icon: 'fa-solid fa-check-circle',
                color: 'text-success'
            },
            error: {
                title: 'Something Went Wrong',
                message: 'There was an error loading the invitation. Please try again later.',
                icon: 'fa-solid fa-exclamation-triangle',
                color: 'text-error'
            }
        };

        const statusInfo = statusMessages[status as keyof typeof statusMessages];

        return (
            <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex items-center justify-center p-4">
                <div className="card bg-base-100 shadow-xl rounded-2xl max-w-md w-full">
                    <div className="card-body text-center">
                        <div className={`w-16 h-16 ${statusInfo.color} mx-auto mb-4 flex items-center justify-center`}>
                            <i className={`${statusInfo.icon} text-4xl`} aria-hidden />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">{statusInfo.title}</h1>
                        <p className="text-base-content/70 mb-6">{statusInfo.message}</p>

                        {status === 'already_accepted' && (
                            <HoverScale scale={1.02}>
                                <button
                                    className="btn btn-primary rounded-xl"
                                    onClick={() => router.push('/dashboard')}
                                >
                                    Go to Dashboard
                                </button>
                            </HoverScale>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex items-center justify-center p-4">
            <div className="card bg-base-100 shadow-xl rounded-2xl max-w-lg w-full">
                <div className="card-body">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-user-plus text-2xl" aria-hidden />
                        </div>
                        <h1 className="text-2xl font-bold">You&apos;re Invited!</h1>
                        <p className="text-base-content/70">Join {invitation.tenant_name} on helpNINJA</p>
                    </div>

                    <div className="bg-base-200/50 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="avatar placeholder">
                                <div className="w-8 h-8 bg-primary/20 text-primary rounded-full">
                                    <i className="fa-duotone fa-solid fa-envelope text-sm" aria-hidden />
                                </div>
                            </div>
                            <div>
                                <p className="font-medium">{invitation.email}</p>
                                <p className="text-sm text-base-content/60">Invited by {invitation.invited_by}</p>
                            </div>
                        </div>

                        <div className="mb-3">
                            <span className="badge badge-primary badge-sm mr-2">{invitation.role}</span>
                            <span className="text-sm text-base-content/70">
                                {getRoleDescription(invitation.role)}
                            </span>
                        </div>

                        <div className="text-xs text-base-content/50">
                            Expires: {new Date(invitation.expires_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleAccept} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <label className="form-control">
                                <div className="label">
                                    <span className="label-text">First Name</span>
                                </div>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                />
                            </label>

                            <label className="form-control">
                                <div className="label">
                                    <span className="label-text">Last Name</span>
                                </div>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                />
                            </label>
                        </div>

                        <div className="text-xs text-base-content/60 bg-base-200/30 p-3 rounded-lg">
                            Your name will help team members identify you in the dashboard.
                        </div>

                        <HoverScale scale={1.02}>
                            <button
                                type="submit"
                                className={`btn btn-primary w-full ${accepting ? 'loading' : ''}`}
                                disabled={accepting}
                            >
                                {accepting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Accepting...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-duotone fa-solid fa-check mr-2" aria-hidden />
                                        Accept Invitation
                                    </>
                                )}
                            </button>
                        </HoverScale>
                    </form>

                    <div className="text-center text-xs text-base-content/50 mt-4">
                        By accepting, you agree to join {invitation.tenant_name} with {invitation.role} permissions.
                    </div>
                </div>
            </div>
        </div>
    );
}

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

interface AcceptanceResponse {
    success: boolean;
    message: string;
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        clerk_user_id: string;
    };
    tenant: {
        id: string;
        name: string;
        role: string;
    };
    next_action: 'redirect_to_signin';
    signin_url: string;
}

export default function InvitationPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [status, setStatus] = useState<InvitationStatus>('loading');
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        password: ''
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

        // Validate required fields
        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.password.trim()) {
            toastUtils.error('Please fill in all required fields');
            return;
        }

        if (formData.password.length < 8) {
            toastUtils.error('Password must be at least 8 characters long');
            return;
        }

        setAccepting(true);
        try {
            const response = await fetch(`/api/invitations/${token}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    password: formData.password,
                }),
            });

            const data: AcceptanceResponse = await response.json();

            if (response.ok) {
                toastUtils.success(`Welcome ${data.user.first_name}! Your account has been created and you've been added to ${data.tenant.name}.`);
                setTimeout(() => {
                    window.location.href = data.signin_url;
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
                icon: 'fa-duotone fa-solid fa-question-circle',
                color: 'text-error'
            },
            expired: {
                title: 'Invitation Expired',
                message: 'This invitation has expired. Please contact the team admin for a new invitation.',
                icon: 'fa-duotone fa-solid fa-clock',
                color: 'text-warning'
            },
            already_accepted: {
                title: 'Already Accepted',
                message: 'This invitation has already been accepted. You should already have access to the team.',
                icon: 'fa-duotone fa-solid fa-check-circle',
                color: 'text-success'
            },
            error: {
                title: 'Something Went Wrong',
                message: 'There was an error loading the invitation. Please try again later.',
                icon: 'fa-duotone fa-solid fa-exclamation-triangle',
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
                        <h1 className="text-2xl font-bold">Create Your Account</h1>
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
                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">First Name <span className="text-error">*</span></legend>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                    required
                                />
                            </fieldset>

                            <fieldset className="fieldset">
                                <legend className="fieldset-legend">Last Name <span className="text-error">*</span></legend>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                    required
                                />
                            </fieldset>
                        </div>

                        <fieldset className="fieldset">
                            <legend className="fieldset-legend">Password <span className="text-error">*</span></legend>
                            <input
                                type="password"
                                className="input w-full"
                                placeholder="Create a secure password (min 8 characters)"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                minLength={8}
                                required
                            />
                        </fieldset>

                        <div className="text-xs text-base-content/60 bg-base-200/30 p-3 rounded-lg">
                            <i className="fa-duotone fa-solid fa-info-circle mr-2" aria-hidden />
                            Your account will be created and you&apos;ll be automatically added to {invitation.tenant_name} with {invitation.role} permissions.
                        </div>

                        <HoverScale scale={1.02}>
                            <button
                                type="submit"
                                className={`btn btn-primary w-full rounded-xl ${accepting ? 'loading' : ''}`}
                                disabled={accepting}
                            >
                                {accepting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-duotone fa-solid fa-user-plus mr-2" aria-hidden />
                                        Create Account & Join Team
                                    </>
                                )}
                            </button>
                        </HoverScale>
                    </form>

                    <div className="text-center text-xs text-base-content/50 mt-4">
                        By creating your account, you agree to join {invitation.tenant_name} with {invitation.role} permissions.
                    </div>
                </div>
            </div>
        </div>
    );
}

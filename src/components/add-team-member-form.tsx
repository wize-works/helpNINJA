"use client";

import { useState } from 'react';
import { getRoleInfo, type Role } from '@/lib/permissions';
import { getAssignableRoles } from '@/lib/role-utils';
import { HoverScale } from './ui/animated-page';
import { toast } from '@/lib/toast';

interface AddTeamMemberFormProps {
    currentUserRole: Role;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AddTeamMemberForm({
    currentUserRole,
    onSuccess,
    onCancel
}: AddTeamMemberFormProps) {
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'viewer' as Role,
        method: 'direct', // 'direct' or 'invitation'
        message: '' // Optional message for invitations
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const assignableRoles = getAssignableRoles(currentUserRole);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }

        if (!formData.role) {
            newErrors.role = 'Role is required';
        } else if (!assignableRoles.includes(formData.role)) {
            newErrors.role = 'Invalid role selected';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const endpoint = formData.method === 'direct' ? '/api/team' : '/api/team/invitations';
            const payload = {
                email: formData.email.trim(),
                role: formData.role,
                firstName: formData.firstName.trim() || undefined,
                lastName: formData.lastName.trim() || undefined,
                message: formData.method === 'invitation' ? formData.message.trim() || undefined : undefined
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();

                if (formData.method === 'invitation') {
                    if (data.email_sent) {
                        toast.success({ message: `Invitation sent to ${formData.email}! They will receive an email to join your team.` });
                    } else {
                        toast.info({ message: `Invitation created but email delivery failed. The user can still be added manually.` });
                    }
                } else {
                    toast.success({ message: `${formData.email} has been added to your team!` });
                }

                onSuccess();
            } else {
                const error = await response.json();
                setErrors({ general: error.error || 'Failed to add team member' });
            }
        } catch (error) {
            console.error('Error adding team member:', error);
            setErrors({ general: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-user-plus text-lg text-primary" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-base-content">Add Team Member</h3>
                            <p className="text-base-content/60 text-sm">Invite new users to collaborate on your team</p>
                        </div>
                    </div>
                    <button
                        className="btn  btn-sm btn-square rounded-lg"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        <i className="fa-duotone fa-solid fa-times" aria-hidden />
                    </button>
                </div>

                {errors.general && (
                    <div className="bg-gradient-to-r from-error/10 to-error/5 border border-error/20 rounded-2xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-error/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="fa-duotone fa-solid fa-triangle-exclamation text-sm text-error" aria-hidden />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-error mb-1">Failed to Add Member</h4>
                                <p className="text-sm text-error/80">{errors.general}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Method Selection */}
                    <fieldset className="space-y-4">
                        <legend className="text-base font-semibold text-base-content mb-3">Invitation Method</legend>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className={`btn ${formData.method === 'direct' ? 'btn-primary' : 'btn-outline'} h-auto p-4 flex-col gap-2 transition-all duration-200 focus:scale-[1.02]`}
                                onClick={() => setFormData(prev => ({ ...prev, method: 'direct' }))}
                                disabled={loading}
                            >
                                <i className="fa-duotone fa-solid fa-user-plus text-lg" aria-hidden />
                                <span className="font-medium">Add Directly</span>
                                <span className="text-xs opacity-80">Immediate access</span>
                            </button>
                            <button
                                type="button"
                                className={`btn ${formData.method === 'invitation' ? 'btn-primary' : 'btn-outline'} h-auto p-4 flex-col gap-2 transition-all duration-200 focus:scale-[1.02]`}
                                onClick={() => setFormData(prev => ({ ...prev, method: 'invitation' }))}
                                disabled={loading}
                            >
                                <i className="fa-duotone fa-solid fa-envelope text-lg" aria-hidden />
                                <span className="font-medium">Send Invitation</span>
                                <span className="text-xs opacity-80">Email invitation</span>
                            </button>
                        </div>

                        <div className="text-xs text-base-content/60 bg-base-200/30 px-3 py-2 rounded-lg">
                            {formData.method === 'direct'
                                ? 'User will be added immediately with access to your team'
                                : 'User will receive an invitation email to join your team'
                            }
                        </div>
                    </fieldset>

                    {/* Member Information */}
                    <fieldset className="space-y-4">
                        <legend className="text-base font-semibold text-base-content mb-3">Member Information</legend>

                        {/* Email */}
                        <label className="block">
                            <span className="text-sm font-medium text-base-content mb-2 block">
                                Email Address
                                <span className="text-error ml-1">*</span>
                            </span>
                            <input
                                type="email"
                                className={`input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02] ${errors.email ? 'input-error' : ''}`}
                                placeholder="colleague@company.com"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, email: e.target.value }));
                                    clearError('email');
                                }}
                                disabled={loading}
                                required
                            />
                            {errors.email && (
                                <div className="text-xs text-error mt-1">{errors.email}</div>
                            )}
                            <div className="text-xs text-base-content/60 mt-1">
                                This email will be used for login and notifications
                            </div>
                        </label>

                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-sm font-medium text-base-content mb-2 block">First Name</span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                    disabled={loading}
                                />
                                <div className="text-xs text-base-content/60 mt-1">
                                    Optional - for display purposes
                                </div>
                            </label>

                            <label className="block">
                                <span className="text-sm font-medium text-base-content mb-2 block">Last Name</span>
                                <input
                                    type="text"
                                    className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                    disabled={loading}
                                />
                                <div className="text-xs text-base-content/60 mt-1">
                                    Optional - for display purposes
                                </div>
                            </label>
                        </div>
                    </fieldset>

                    {/* Role Selection */}
                    <fieldset className="space-y-4">
                        <legend className="text-base font-semibold text-base-content mb-3">Role & Permissions</legend>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {assignableRoles.map((role) => {
                                const roleInfo = getRoleInfo(role);
                                return (
                                    <label key={role} className="cursor-pointer flex flex-row">
                                        <input
                                            type="radio"
                                            className="radio radio-primary"
                                            name="role"
                                            value={role}
                                            checked={formData.role === role}
                                            onChange={(e) => {
                                                setFormData(prev => ({ ...prev, role: e.target.value as Role }));
                                                clearError('role');
                                            }}
                                            disabled={loading}
                                        />
                                        <div className="ml-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <i className={`fa-duotone fa-solid ${roleInfo.icon} text-${roleInfo.color}`} aria-hidden />
                                                <span className="font-medium">{roleInfo.label}</span>
                                            </div>
                                            <div className="text-xs text-base-content/60">
                                                {roleInfo.description}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.role && (
                            <div className="text-xs text-error mt-1">{errors.role}</div>
                        )}
                        <div className="text-xs text-base-content/60 bg-base-200/30 px-3 py-2 rounded-lg">
                            Role determines what actions the user can perform in your team
                        </div>
                    </fieldset>

                    {/* Message for Invitations */}
                    {formData.method === 'invitation' && (
                        <fieldset className="space-y-4">
                            <legend className="text-base font-semibold text-base-content mb-3">Personal Message (Optional)</legend>

                            <label className="block">
                                <span className="text-sm font-medium text-base-content mb-2 block">
                                    Message
                                </span>
                                <textarea
                                    className="textarea textarea-bordered w-full focus:textarea-primary transition-all duration-200 focus:scale-[1.02]"
                                    placeholder="Hi! I'd like to invite you to join our team on helpNINJA..."
                                    rows={3}
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    disabled={loading}
                                />
                                <div className="text-xs text-base-content/60 mt-1">
                                    This message will be included in the invitation email
                                </div>
                            </label>
                        </fieldset>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                        <div className="text-sm text-base-content/60">
                            {formData.method === 'direct'
                                ? 'Add a new team member with immediate access'
                                : 'Send an invitation for the user to join your team'
                            }
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                className="btn  rounded-xl"
                                onClick={onCancel}
                                disabled={loading}
                            >
                                Cancel
                            </button>

                            <HoverScale scale={1.02}>
                                <button
                                    type="submit"
                                    className={`btn btn-primary rounded-xl ${loading ? 'loading' : ''} min-w-32`}
                                    disabled={loading || !formData.email.trim() || !formData.role}
                                >
                                    {loading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <i className={`fa-duotone fa-solid ${formData.method === 'direct' ? 'fa-user-plus' : 'fa-envelope'} mr-2`} aria-hidden />
                                            {formData.method === 'direct' ? 'Add Member' : 'Send Invitation'}
                                        </>
                                    )}
                                </button>
                            </HoverScale>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

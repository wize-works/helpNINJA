"use client";

import { useState, useEffect } from 'react';
import { useTenant } from "@/components/tenant-context";
import { UserMember, type Role } from '@/lib/permissions';
import TeamMemberCard from '@/components/team-member-card';
import AddTeamMemberForm from '@/components/add-team-member-form';
import TeamInvitations from '@/components/team-invitations';
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { toast } from '@/lib/toast';
import StatCard from '@/components/ui/stat-card';

export default function TeamPage() {
    const { tenantId } = useTenant();
    const [members, setMembers] = useState<UserMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [currentUserRole] = useState<Role>('admin'); // For demo - should come from auth
    const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        pending: 0,
        suspended: 0
    });

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Tools", href: "/dashboard", icon: "fa-wrench" },
        { label: "Team", icon: "fa-users" }
    ];

    useEffect(() => {
        if (tenantId) {
            loadTeamMembers();
        }
    }, [tenantId]);

    const loadTeamMembers = async () => {
        try {
            const response = await fetch('/api/team');

            if (response.ok) {
                const data = await response.json();
                setMembers(data);

                // Calculate stats
                const total = data.length;
                const active = data.filter((m: UserMember) => m.status === 'active').length;
                const pending = data.filter((m: UserMember) => m.status === 'pending').length;
                const suspended = data.filter((m: UserMember) => m.status === 'suspended').length;

                setStats({ total, active, pending, suspended });
            }
        } catch (error) {
            console.error('Error loading team members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSuccess = () => {
        setShowAddForm(false);
        loadTeamMembers();
    };

    const handleEdit = () => {
        // TODO: Show edit modal
        // Edit member action (implementation pending)
    };

    const handleRemove = async (member: UserMember) => {
        try {
            const response = await fetch(`/api/team/${member.user_id}`, {
                method: 'DELETE',

            });

            if (response.ok) {
                loadTeamMembers();
                toast.success({ message: 'Team member removed successfully' });
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to remove team member');
            }
        } catch (error) {
            console.error('Error removing team member:', error);
            toast.error({ message: 'Failed to remove team member' });
        }
    };

    const handleRoleChange = async (member: UserMember, newRole: Role) => {
        try {
            const response = await fetch(`/api/team/${member.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                loadTeamMembers();
                toast.success({ message: 'Role updated successfully' });
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to update role');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            toast.error({ message: 'Failed to update role' });
        }
    };

    const handleStatusChange = async (member: UserMember, newStatus: 'active' | 'suspended') => {
        try {
            const response = await fetch(`/api/team/${member.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                loadTeamMembers();
                toast.success({ message: 'Status updated successfully' });
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error({ message: 'Failed to update status' });
        }
    };

    if (!tenantId) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Team Management</h1>
                                <p className="text-base-content/60 mt-2">
                                    Manage team members, roles, and permissions for your organization
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <HoverScale scale={1.02}>
                                    <button
                                        className="btn btn-primary rounded-xl"
                                        onClick={() => setShowAddForm(true)}
                                    >
                                        <i className="fa-duotone fa-solid fa-user-plus mr-2" aria-hidden />
                                        Add Member
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Stats Overview */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Members"
                                value={stats.total}
                                description="All roles"
                                icon="fa-users"
                                color="primary"
                            />

                            <StatCard
                                title="Active"
                                value={stats.active}
                                description="Currently active"
                                icon="fa-user-check"
                                color="success"
                            />

                            <StatCard
                                title="Pending"
                                value={stats.pending}
                                description="Invitations sent"
                                icon="fa-user-clock"
                                color="warning"
                            />

                            <StatCard
                                title="Suspended"
                                value={stats.suspended}
                                description="Access disabled"
                                icon="fa-user-slash"
                                color="error"
                            />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Add Member Form */}
                {showAddForm && (
                    <StaggerContainer>
                        <StaggerChild>
                            <AddTeamMemberForm
                                currentUserRole={currentUserRole}
                                onSuccess={handleAddSuccess}
                                onCancel={() => setShowAddForm(false)}
                            />
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Tabs */}
                {!showAddForm && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="tabs tabs-bordered">
                                <button
                                    className={`tab tab-lg ${activeTab === 'members' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('members')}
                                >
                                    <i className="fa-duotone fa-solid fa-users mr-2" aria-hidden />
                                    Team Members ({stats.total})
                                </button>
                                <button
                                    className={`tab tab-lg ${activeTab === 'invitations' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('invitations')}
                                >
                                    <i className="fa-duotone fa-solid fa-envelope mr-2" aria-hidden />
                                    Pending Invitations
                                </button>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Content */}
                {!showAddForm && (
                    <StaggerContainer>
                        <StaggerChild>
                            {activeTab === 'members' ? (
                                loading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {Array.from({ length: 6 }, (_, i) => (
                                            <div key={i} className="animate-pulse bg-base-300/60 h-40 rounded-xl"></div>
                                        ))}
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="card bg-base-100 rounded-2xl shadow-sm">
                                        <div className="p-12 text-center">
                                            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                <i className="fa-duotone fa-solid fa-users text-3xl text-primary" aria-hidden />
                                            </div>
                                            <h3 className="text-xl font-semibold text-base-content mb-3">No team members yet</h3>
                                            <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                                                Build your team by inviting colleagues to collaborate on your AI support system
                                            </p>
                                            <div className="flex items-center justify-center gap-2 text-sm text-base-content/50 mb-6">
                                                <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
                                                <span>Team members can help manage content, conversations, and analytics</span>
                                            </div>
                                            <HoverScale scale={1.02}>
                                                <button
                                                    className="btn btn-primary rounded-xl"
                                                    onClick={() => setShowAddForm(true)}
                                                >
                                                    <i className="fa-duotone fa-solid fa-user-plus mr-2" aria-hidden />
                                                    Add Your First Member
                                                </button>
                                            </HoverScale>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {members.map((member) => (
                                            <TeamMemberCard
                                                key={member.user_id}
                                                member={member}
                                                currentUserRole={currentUserRole}
                                                onEdit={handleEdit}
                                                onRemove={handleRemove}
                                                onRoleChange={handleRoleChange}
                                                onStatusChange={handleStatusChange}
                                            />
                                        ))}
                                    </div>
                                )
                            ) : (
                                <TeamInvitations onInvitationCancelled={loadTeamMembers} />
                            )}
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Help Section */}
                {!showAddForm && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-lightbulb text-lg text-primary" aria-hidden />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-base-content">Team Roles & Permissions</h2>
                                            <p className="text-base-content/60 text-sm">Understanding access levels and responsibilities</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-crown text-error" aria-hidden />
                                                <h3 className="font-semibold">Owner</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70 mb-2">
                                                Full access to all features including billing, team management, and tenant settings.
                                            </p>
                                            <div className="text-xs text-base-content/60">
                                                • Manage billing & plans<br />
                                                • Full team control<br />
                                                • All feature access
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-user-tie text-primary" aria-hidden />
                                                <h3 className="font-semibold">Admin</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70 mb-2">
                                                Manage all features except billing and tenant settings. Can invite and manage other team members.
                                            </p>
                                            <div className="text-xs text-base-content/60">
                                                • Team management<br />
                                                • Content & rules<br />
                                                • View analytics
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-chart-line text-secondary" aria-hidden />
                                                <h3 className="font-semibold">Analyst</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70 mb-2">
                                                Manage content, escalation rules, and view analytics. Perfect for content managers.
                                            </p>
                                            <div className="text-xs text-base-content/60">
                                                • Manage content<br />
                                                • Create rules<br />
                                                • View reports
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-headset text-accent" aria-hidden />
                                                <h3 className="font-semibold">Support</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70 mb-2">
                                                Handle conversations and view content. Ideal for customer support representatives.
                                            </p>
                                            <div className="text-xs text-base-content/60">
                                                • Manage conversations<br />
                                                • View content<br />
                                                • Basic analytics
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <i className="fa-duotone fa-solid fa-eye text-neutral" aria-hidden />
                                                <h3 className="font-semibold">Viewer</h3>
                                            </div>
                                            <p className="text-sm text-base-content/70 mb-2">
                                                Read-only access to conversations and analytics. Great for stakeholders and observers.
                                            </p>
                                            <div className="text-xs text-base-content/60">
                                                • View conversations<br />
                                                • Read content<br />
                                                • View analytics
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}
            </div>
        </AnimatedPage>
    );
}

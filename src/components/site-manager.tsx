"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import DomainVerification from "./domain-verification";
import WidgetSetupModal from "./widget-setup-modal";

type Site = {
    id: string;
    domain: string;
    name: string;
    status: 'active' | 'paused' | 'pending';
    verified: boolean;
    verification_token?: string;
    created_at: string;
    updated_at: string;
};

export default function SiteManager() {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);
    const [verifyingSite, setVerifyingSite] = useState<Site | null>(null);
    const [setupSite, setSetupSite] = useState<Site | null>(null);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState({
        domain: '',
        name: '',
        status: 'active' as 'active' | 'paused' | 'pending'
    });
    const [formLoading, setFormLoading] = useState(false);

    const loadSites = useCallback(async () => {
        try {
            const res = await fetch('/api/sites', {
                // strict server-side tenant resolution; no client headers
            });

            if (res.ok) {
                const data = await res.json();
                setSites(data);
            } else {
                console.error('Failed to load sites');
            }
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSites();
    }, [loadSites]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!formData.domain.trim() || !formData.name.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(formData.domain)) {
            toast.error('Please enter a valid domain name');
            return;
        }

        setFormLoading(true);
        const toastId = toast.loading(editingSite ? 'Updating site...' : 'Creating site...');

        try {
            const url = editingSite ? `/api/sites/${editingSite.id}` : '/api/sites';
            const method = editingSite ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'content-type': 'application/json',
                    // strict server-side tenant resolution; no client headers
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || `Failed to ${editingSite ? 'update' : 'create'} site`, { id: toastId });
                return;
            }

            await res.json();
            toast.success(
                editingSite ? 'Site updated successfully!' : 'Site created successfully!',
                { id: toastId }
            );

            // Reset form and close
            setFormData({ domain: '', name: '', status: 'active' });
            setShowAddForm(false);
            setEditingSite(null);

            // Reload sites
            await loadSites();
            router.refresh();
        } catch {
            toast.error('Network error. Please try again.', { id: toastId });
        } finally {
            setFormLoading(false);
        }
    }

    async function handleDelete(site: Site) {
        if (!confirm(`Are you sure you want to delete "${site.name}"? This action cannot be undone.`)) {
            return;
        }

        const toastId = toast.loading('Deleting site...');

        try {
            const res = await fetch(`/api/sites/${site.id}`, {
                method: 'DELETE',
                // strict server-side tenant resolution; no client headers
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete site', { id: toastId });
                return;
            }

            toast.success('Site deleted successfully!', { id: toastId });
            await loadSites();
            router.refresh();
        } catch {
            toast.error('Network error. Please try again.', { id: toastId });
        }
    }

    function handleEdit(site: Site) {
        setEditingSite(site);
        setFormData({
            domain: site.domain,
            name: site.name,
            status: site.status
        });
        setShowAddForm(true);
    }

    function handleCancelEdit() {
        setEditingSite(null);
        setFormData({ domain: '', name: '', status: 'active' });
        setShowAddForm(false);
    }

    function handleVerifySite(site: Site) {
        setVerifyingSite(site);
    }

    function handleCancelVerification() {
        setVerifyingSite(null);
    }

    function handleWidgetSetup(site: Site) {
        setSetupSite(site);
        setShowSetupModal(true);
    }

    function handleCloseSetupModal() {
        setShowSetupModal(false);
        setSetupSite(null);
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="skeleton h-8 w-32"></div>
                <div className="skeleton h-32 w-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-base-content">Registered Sites</h2>
                    <p className="text-base-content/60 mt-2">
                        Manage the domains where your chat widget can be embedded
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-primary rounded-xl"
                        disabled={showAddForm}
                    >
                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                        Add Site
                    </button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="card bg-base-100 rounded-2xl shadow-sm">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <i className={`fa-duotone fa-solid ${editingSite ? 'fa-pencil' : 'fa-plus'} text-lg text-primary`} aria-hidden />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-base-content">
                                    {editingSite ? 'Edit Site' : 'Add New Site'}
                                </h3>
                                <p className="text-base-content/60 text-sm">
                                    {editingSite ? 'Update your site configuration' : 'Register a new domain for your chat widget'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Site Information */}
                            <fieldset className="space-y-4">
                                <legend className="text-base font-semibold text-base-content mb-3">Site Information</legend>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Domain Input */}
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                            Domain
                                            <span className="text-error ml-1">*</span>
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="example.com"
                                            className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02] rounded-xl"
                                            value={formData.domain}
                                            onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase() })}
                                            disabled={formLoading}
                                            required
                                        />
                                        <div className="text-xs text-base-content/60 mt-1">
                                            Enter domain without https:// (e.g., example.com)
                                        </div>
                                    </label>

                                    {/* Site Name Input */}
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                            Site Name
                                            <span className="text-error ml-1">*</span>
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="My Website"
                                            className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02] rounded-xl"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            disabled={formLoading}
                                            required
                                        />
                                        <div className="text-xs text-base-content/60 mt-1">
                                            Display name for your site
                                        </div>
                                    </label>
                                </div>
                            </fieldset>

                            {/* Site Configuration */}
                            <fieldset className="space-y-4">
                                <legend className="text-base font-semibold text-base-content mb-3">Configuration</legend>

                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Status</span>
                                    <select
                                        className="select select-bordered w-full focus:select-primary transition-all duration-200 rounded-xl"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' | 'pending' })}
                                        disabled={formLoading}
                                    >
                                        <option value="active">Active - Widget enabled</option>
                                        <option value="paused">Paused - Widget disabled</option>
                                        <option value="pending">Pending - Awaiting verification</option>
                                    </select>
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Control whether the chat widget is active on this site
                                    </div>
                                </label>
                            </fieldset>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                                <div className="text-sm text-base-content/60">
                                    {editingSite ? 'Update your site configuration' : 'Create a new site for your chat widget'}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="btn btn-ghost rounded-xl"
                                        disabled={formLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`btn btn-primary rounded-xl ${formLoading ? 'loading' : ''} min-w-32`}
                                        disabled={formLoading}
                                    >
                                        {formLoading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                {editingSite ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            <>
                                                <i className={`fa-duotone fa-solid ${editingSite ? 'fa-save' : 'fa-plus'} mr-2`} aria-hidden />
                                                {editingSite ? 'Update Site' : 'Create Site'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Domain Verification Info */}
            {sites.length > 0 && sites.some(site => !site.verified) && (
                <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-warning/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i className="fa-duotone fa-solid fa-triangle-exclamation text-warning" aria-hidden />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold text-base-content mb-2">Domain verification recommended</div>
                            <div className="text-sm text-base-content/70 mb-3">
                                While you can continue without verification, we recommend verifying your domains for security and to prevent unauthorized use of your widget. Verified domains will have the chat widget enabled.
                            </div>
                            <div className="text-xs text-base-content/60">
                                <strong>Verification methods available:</strong> Meta tag, DNS record, or file upload
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Domain Verification Section */}
            {verifyingSite && (
                <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-shield-check text-lg text-warning" aria-hidden />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-base-content">Verify Domain</h3>
                                    <p className="text-base-content/60 text-sm">
                                        Verify ownership of <span className="font-mono font-semibold">{verifyingSite.domain}</span> to enable the chat widget.  This ensures that only authorized sites can use your widget.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCancelVerification}
                                className="btn btn-ghost btn-sm btn-square rounded-lg"
                                disabled={loading}
                            >
                                <i className="fa-duotone fa-solid fa-times" aria-hidden />
                            </button>
                        </div>

                        <DomainVerification
                            siteId={verifyingSite.id}
                            siteName={verifyingSite.name}
                            domain={verifyingSite.domain}
                            initialVerified={verifyingSite.verified}
                            onVerificationChange={(verified) => {
                                if (verified) {
                                    setVerifyingSite(null);
                                    loadSites(); // Refresh the sites list
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Sites List */}
            {sites.length === 0 ? (
                <div className="card bg-base-100 rounded-2xl shadow-sm">
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <i className="fa-duotone fa-solid fa-globe text-3xl text-primary" aria-hidden />
                        </div>
                        <h3 className="text-xl font-semibold text-base-content mb-3">No sites registered</h3>
                        <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                            Add your first website to start using the chat widget
                        </p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary rounded-xl"
                            disabled={showAddForm}
                        >
                            <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                            Add Your First Site
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {sites.map((site) => (
                            <div key={site.id} className="group relative bg-gradient-to-br from-base-100/80 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                                {/* Status indicator bar */}
                                <div className={`absolute top-0 left-0 right-0 h-1 ${site.status === 'active' ? 'bg-gradient-to-r from-success to-success/60' :
                                    site.status === 'paused' ? 'bg-gradient-to-r from-warning to-warning/60' :
                                        'bg-gradient-to-r from-info to-info/60'
                                    }`} />


                                <div className="p-6">
                                    {/* Header with icon and name */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${site.status === 'active' ? 'bg-success/10 text-success' :
                                            site.status === 'paused' ? 'bg-warning/10 text-warning' :
                                                'bg-info/10 text-info'
                                            }`}>
                                            <i className="fa-duotone fa-solid fa-globe text-xl" aria-hidden />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-base-content mb-1 truncate">{site.name}</h3>
                                            <p className="text-base-content/70 font-mono text-sm truncate">{site.domain}</p>
                                        </div>
                                    </div>

                                    {/* Status and verification info */}
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${site.status === 'active' ? 'bg-success animate-pulse' :
                                                    site.status === 'paused' ? 'bg-warning' :
                                                        'bg-info'
                                                    }`} />
                                                <span className="text-sm font-medium text-base-content">
                                                    {site.status === 'active' ? 'Active' :
                                                        site.status === 'paused' ? 'Paused' :
                                                            'Pending'}
                                                </span>
                                            </div>
                                            <div className={`badge badge-sm ${site.verified ? 'badge-success' : 'badge-warning'
                                                }`}>
                                                {site.verified ? 'Verified' : 'Unverified'}
                                            </div>
                                        </div>

                                        {/* Additional metadata */}
                                        <div className="flex items-center justify-between text-xs text-base-content/60">
                                            <span className="flex items-center gap-1">
                                                <i className="fa-duotone fa-solid fa-calendar" aria-hidden />
                                                Created {new Date(site.created_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <i className="fa-duotone fa-solid fa-clock" aria-hidden />
                                                {new Date(site.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-base-200/40">
                                        {site.verified && (
                                            <button
                                                onClick={() => handleWidgetSetup(site)}
                                                className="btn btn-outline btn-sm rounded-xl group-hover:btn-success transition-all duration-200"
                                            >
                                                <i className="fa-duotone fa-solid fa-code mr-2" aria-hidden />
                                                Widget Setup
                                            </button>
                                        )}
                                        {!site.verified && (
                                            <button
                                                onClick={() => handleVerifySite(site)}
                                                className="btn btn-outline btn-sm rounded-xl group-hover:btn-primary transition-all duration-200"
                                            >
                                                <i className="fa-duotone fa-solid fa-shield-check mr-2" aria-hidden />
                                                Verify
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEdit(site)}
                                            className="btn btn-ghost btn-sm rounded-xl hover:bg-base-200/60 transition-all duration-200 flex-1"
                                            disabled={showAddForm}
                                        >
                                            <i className="fa-duotone fa-solid fa-pencil mr-2" aria-hidden />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(site)}
                                            className="btn btn-ghost btn-sm rounded-xl text-error hover:bg-error/10 hover:text-error transition-all duration-200"
                                            title="Delete site"
                                        >
                                            <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Widget Setup Modal */}
            {setupSite && (
                <WidgetSetupModal
                    open={showSetupModal}
                    onClose={handleCloseSetupModal}
                    siteId={setupSite.id}
                    siteName={setupSite.name}
                    domain={setupSite.domain}
                    scriptKey={setupSite.verification_token || ''}
                />
            )}
        </div>
    );
}

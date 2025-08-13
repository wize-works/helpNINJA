"use client";

import { useState, useEffect, useCallback } from 'react';
import SiteSelector from './site-selector';
import CrawlStatus from './crawl-status';
import { HoverScale } from './ui/animated-page';
import { toastUtils } from '@/lib/toast';

type Source = {
    id: string;
    kind: 'url' | 'sitemap' | 'pdf' | 'manual';
    url?: string;
    title?: string;
    status: 'ready' | 'crawling' | 'error' | 'disabled';
    last_crawled_at?: string;
    created_at: string;
    document_count: number;
    chunk_count: number;
    site_id?: string;
    site_name?: string;
    site_domain?: string;
};

type Site = {
    id: string;
    domain: string;
    name: string;
    status: string;
    verified: boolean;
};

interface SourcesTableProps {
    tenantId: string;
}

export default function SourcesTable({ tenantId }: SourcesTableProps) {
    const [sources, setSources] = useState<Source[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingSource, setEditingSource] = useState<Source | null>(null);
    const [formData, setFormData] = useState<{
        kind: 'url' | 'sitemap' | 'pdf' | 'manual';
        url: string;
        title: string;
        siteId: string;
    }>({
        kind: 'url',
        url: '',
        title: '',
        siteId: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const loadSources = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedSite) params.set('siteId', selectedSite);

            const response = await fetch(`/api/sources?${params}`, {
                headers: { 'x-tenant-id': tenantId }
            });
            if (response.ok) {
                const data = await response.json();
                setSources(data);
            }
        } catch (error) {
            console.error('Error loading sources:', error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, selectedSite]);

    const loadSites = useCallback(async () => {
        try {
            const response = await fetch('/api/sites', {
                headers: { 'x-tenant-id': tenantId }
            });
            if (response.ok) {
                const data = await response.json();
                setSites(data);
            }
        } catch (error) {
            console.error('Error loading sites:', error);
        }
    }, [tenantId]);

    useEffect(() => {
        loadSources();
        loadSites();
    }, [loadSources, loadSites]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = editingSource ? `/api/sources/${editingSource.id}` : '/api/sources';
            const method = editingSource ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowAddForm(false);
                setEditingSource(null);
                setFormData({ kind: 'url', url: '', title: '', siteId: '' });
                loadSources();
                toastUtils.success(editingSource ? 'Source updated successfully' : 'Source created successfully');
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to save source');
            }
        } catch (error) {
            console.error('Error saving source:', error);
            toastUtils.error('Failed to save source');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (source: Source) => {
        setEditingSource(source);
        setFormData({
            kind: source.kind,
            url: source.url || '',
            title: source.title || '',
            siteId: source.site_id || ''
        });
        setShowAddForm(true);
    };

    const handleDelete = async (source: Source) => {
        if (!confirm(`Are you sure you want to delete "${source.title || source.url}"?`)) return;

        try {
            const response = await fetch(`/api/sources/${source.id}`, {
                method: 'DELETE',
                headers: { 'x-tenant-id': tenantId }
            });

            if (response.ok) {
                loadSources();
                toastUtils.success('Source deleted successfully');
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to delete source');
            }
        } catch (error) {
            console.error('Error deleting source:', error);
            toastUtils.error('Failed to delete source');
        }
    };

    const handleCrawl = async (source: Source) => {
        if (source.status === 'crawling') return;

        try {
            const response = await fetch(`/api/sources/${source.id}/crawl`, {
                method: 'POST',
                headers: { 'x-tenant-id': tenantId }
            });

            if (response.ok) {
                // Refresh the source status
                loadSources();
                const result = await response.json();
                toastUtils.success(`Crawl completed: ${result.documentsCreated} documents, ${result.chunksCreated} chunks`);
            } else {
                const error = await response.json();
                toastUtils.apiError(error, 'Failed to start crawl');
            }
        } catch (error) {
            console.error('Error starting crawl:', error);
            toastUtils.error('Failed to start crawl');
        }
    };

    const getKindIcon = (kind: string) => {
        switch (kind) {
            case 'url': return 'fa-link';
            case 'sitemap': return 'fa-sitemap';
            case 'pdf': return 'fa-file-pdf';
            case 'manual': return 'fa-edit';
            default: return 'fa-file';
        }
    };

    const getKindLabel = (kind: string) => {
        switch (kind) {
            case 'url': return 'Single Page';
            case 'sitemap': return 'Sitemap';
            case 'pdf': return 'PDF Document';
            case 'manual': return 'Manual Entry';
            default: return kind;
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Filter by site</span>
                        </label>
                        <select
                            className="select select-bordered"
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                        >
                            <option value="">All sites</option>
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>
                                    {site.name} ({site.domain})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <HoverScale scale={1.02}>
                    <button
                        className="btn btn-primary rounded-lg"
                        onClick={() => {
                            setEditingSource(null);
                            setFormData({ kind: 'url', url: '', title: '', siteId: selectedSite });
                            setShowAddForm(true);
                        }}
                    >
                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                        Add Source
                    </button>
                </HoverScale>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="card bg-base-100 rounded-2xl shadow-sm">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                <i className="fa-duotone fa-solid fa-plus text-lg text-primary" aria-hidden />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-base-content">
                                    {editingSource ? 'Edit Content Source' : 'Add New Content Source'}
                                </h3>
                                <p className="text-base-content/60 text-sm">
                                    {editingSource ? 'Update source configuration' : 'Configure a new content source for your knowledge base'}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Source Configuration */}
                            <fieldset className="space-y-4">
                                <legend className="text-base font-semibold text-base-content mb-3">Source Configuration</legend>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                            Source Type
                                            <span className="text-error ml-1">*</span>
                                        </span>
                                        <select
                                            className="select select-bordered w-full focus:select-primary transition-all duration-200 focus:scale-[1.02]"
                                            value={formData.kind}
                                            onChange={(e) => setFormData({ ...formData, kind: e.target.value as 'url' | 'sitemap' | 'pdf' | 'manual' })}
                                            required
                                        >
                                            <option value="url">🔗 Single Page</option>
                                            <option value="sitemap">🗺️ Sitemap</option>
                                            <option value="pdf">📄 PDF Document</option>
                                            <option value="manual">✏️ Manual Entry</option>
                                        </select>
                                        <div className="text-xs text-base-content/60 mt-1">
                                            Choose how content will be sourced
                                        </div>
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                            Associated Site
                                        </span>
                                        <SiteSelector
                                            tenantId={tenantId}
                                            value={formData.siteId}
                                            onChange={(siteId) => setFormData({ ...formData, siteId: siteId || '' })}
                                            allowNone={true}
                                            placeholder="No specific site"
                                            className="focus:scale-[1.02] transition-all duration-200"
                                        />
                                        <div className="text-xs text-base-content/60 mt-1">
                                            Optional: prioritize this content for specific site
                                        </div>
                                    </label>
                                </div>
                            </fieldset>

                            {/* Content Details */}
                            <fieldset className="space-y-4">
                                <legend className="text-base font-semibold text-base-content mb-3">Content Details</legend>

                                {formData.kind !== 'manual' && (
                                    <label className="block">
                                        <span className="text-sm font-medium text-base-content mb-2 block">
                                            URL
                                            <span className="text-error ml-1">*</span>
                                        </span>
                                        <input
                                            type="url"
                                            className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                            value={formData.url}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            placeholder={
                                                formData.kind === 'url' ? 'https://example.com/page' :
                                                    formData.kind === 'sitemap' ? 'https://example.com/sitemap.xml' :
                                                        'https://example.com/document.pdf'
                                            }
                                            required
                                        />
                                        <div className="text-xs text-base-content/60 mt-1">
                                            {formData.kind === 'url' && 'Enter the webpage URL to crawl'}
                                            {formData.kind === 'sitemap' && 'Enter the sitemap.xml URL to discover pages'}
                                            {formData.kind === 'pdf' && 'Enter the PDF document URL'}
                                        </div>
                                    </label>
                                )}

                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Display Name
                                        {formData.kind === 'manual' && <span className="text-error ml-1">*</span>}
                                    </span>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02]"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder={
                                            formData.kind === 'manual' ? 'Enter a descriptive name' :
                                                'Optional: custom name for this source'
                                        }
                                        required={formData.kind === 'manual'}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        {formData.kind === 'manual'
                                            ? 'This name will identify your manual content source'
                                            : 'Optional: override the default name derived from content'
                                        }
                                    </div>
                                </label>
                            </fieldset>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                                <div className="text-sm text-base-content/60">
                                    {editingSource ? 'Update your content source settings' : 'Content will be processed after creation'}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-ghost rounded-lg"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setEditingSource(null);
                                            setFormData({ kind: 'url', url: '', title: '', siteId: '' });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <HoverScale scale={1.02}>
                                        <button
                                            type="submit"
                                            className={`btn btn-primary rounded-lg ${submitting ? 'loading' : ''} min-w-32`}
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <span className="loading loading-spinner loading-sm"></span>
                                                    {editingSource ? 'Updating...' : 'Creating...'}
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fa-duotone fa-solid fa-save mr-2" aria-hidden />
                                                    {editingSource ? 'Update Source' : 'Create Source'}
                                                </>
                                            )}
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sources Table */}
            <div className="card bg-base-100 rounded-2xl shadow-sm">
                <div className="p-0">
                    {sources.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <i className="fa-duotone fa-solid fa-database text-3xl text-primary" aria-hidden />
                            </div>
                            <h3 className="text-xl font-semibold text-base-content mb-3">No sources yet</h3>
                            <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                                {selectedSite
                                    ? 'No content sources found for the selected site. Add your first source to start building the knowledge base.'
                                    : 'Add your first content source to start building your knowledge base and enable AI-powered support.'
                                }
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-base-content/50 mb-6">
                                <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
                                <span>Content sources can be web pages, sitemaps, or manual entries</span>
                            </div>
                            <HoverScale scale={1.02}>
                                <button
                                    className="btn btn-primary rounded-lg"
                                    onClick={() => {
                                        setEditingSource(null);
                                        setFormData({ kind: 'url', url: '', title: '', siteId: selectedSite });
                                        setShowAddForm(true);
                                    }}
                                >
                                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                    Add Your First Source
                                </button>
                            </HoverScale>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>Type</th>
                                        <th>Site</th>
                                        <th>Content</th>
                                        <th>Status</th>
                                        <th>Last Crawled</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sources.map((source) => (
                                        <tr key={source.id} className="hover">
                                            <td>
                                                <div>
                                                    <div className="font-semibold">
                                                        {source.title || source.url || 'Manual Entry'}
                                                    </div>
                                                    {source.url && source.title && (
                                                        <div className="text-sm text-base-content/60 truncate max-w-xs">
                                                            {source.url}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <i className={`fa-duotone fa-solid ${getKindIcon(source.kind)} text-primary`} aria-hidden />
                                                    <span className="text-sm">{getKindLabel(source.kind)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {source.site_name ? (
                                                    <div>
                                                        <div className="font-medium">{source.site_name}</div>
                                                        <div className="text-xs text-base-content/60">{source.site_domain}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-base-content/40">No site</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="text-sm">
                                                    <div>{source.document_count} docs</div>
                                                    <div className="text-base-content/60">{source.chunk_count} chunks</div>
                                                </div>
                                            </td>
                                            <td>
                                                <CrawlStatus status={source.status} />
                                            </td>
                                            <td>
                                                {source.last_crawled_at ? (
                                                    <span className="text-sm">
                                                        {new Date(source.last_crawled_at).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-base-content/40">Never</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    {source.kind !== 'manual' && (
                                                        <button
                                                            className={`btn btn-sm btn-outline rounded-lg ${source.status === 'crawling' ? 'loading' : ''}`}
                                                            onClick={() => handleCrawl(source)}
                                                            disabled={source.status === 'crawling'}
                                                            title="Crawl/Re-crawl this source"
                                                        >
                                                            <i className="fa-duotone fa-solid fa-refresh" aria-hidden />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-ghost rounded-lg"
                                                        onClick={() => handleEdit(source)}
                                                        title="Edit source"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-edit" aria-hidden />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost text-error rounded-lg"
                                                        onClick={() => handleDelete(source)}
                                                        title="Delete source"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-trash" aria-hidden />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";
import IngestForm from "@/components/ingest-form";
import DocumentsFilters from "@/components/documents-filters";

import { TableSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale, FadeIn } from "@/components/ui/animated-page";
import { Suspense } from "react";

export const runtime = 'nodejs'

type DocRow = {
    id: string;
    url: string;
    title: string;
    created_at: string;
    site_id?: string;
    site_name?: string;
    site_domain?: string;
    source_kind?: string;
    source_title?: string;
}

async function getDocs(tenantId: string, siteId?: string) {
    let queryText = `
        SELECT d.id, d.url, d.title, d.created_at, d.site_id,
               ts.name as site_name, ts.domain as site_domain,
               s.kind as source_kind, s.title as source_title
        FROM public.documents d
        LEFT JOIN public.tenant_sites ts ON ts.id = d.site_id
        LEFT JOIN public.sources s ON s.id = d.source_id
        WHERE d.tenant_id = $1
    `;

    const params: unknown[] = [tenantId];

    if (siteId) {
        queryText += ' AND d.site_id = $2';
        params.push(siteId);
    }

    queryText += ' ORDER BY d.created_at DESC LIMIT 100';

    const { rows } = await query<DocRow>(queryText, params);
    return rows;
}

function DocumentsTable({ docs, tenantId }: { docs: DocRow[]; tenantId: string }) {
    if (docs.length === 0) {
        return (
            <FadeIn>
                <div className="card bg-base-100 rounded-2xl shadow-sm">
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <i className="fa-duotone fa-solid fa-book-open text-3xl text-primary" aria-hidden />
                        </div>
                        <h3 className="text-xl font-semibold text-base-content mb-3">No documents yet</h3>
                        <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                            Start building your knowledge base by adding content sources. Your AI will learn from this content to provide better support.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
                            <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
                            <span>Add URLs, sitemaps, or upload documents to get started</span>
                        </div>
                    </div>
                </div>
            </FadeIn>
        );
    }

    return (
        <StaggerContainer>
            <StaggerChild>
                <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                    {/* Desktop View */}
                    <div className="hidden lg:block">
                        <div className="p-6 border-b border-base-200/60">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-base-content">Knowledge Base Documents</h3>
                                    <p className="text-sm text-base-content/60 mt-1">Content your AI uses for training and responses</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm text-base-content/60">
                                        <i className="fa-duotone fa-solid fa-files text-xs" aria-hidden />
                                        <span>{docs.length} documents</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <HoverScale scale={1.05}>
                                            <button className="btn btn-sm btn-ghost">
                                                <i className="fa-duotone fa-solid fa-download text-xs" aria-hidden />
                                                Export
                                            </button>
                                        </HoverScale>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-base-200/20">
                                    <tr>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Document</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">Site & Source</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80">URL</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-32">Added</th>
                                        <th className="text-right p-4 text-sm font-semibold text-base-content/80 w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-200/60">
                                    {docs.map((d, index) => (
                                        <tr key={d.id} className="hover:bg-base-200/30 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-info/20 transition-colors">
                                                        <i className="fa-duotone fa-solid fa-file-lines text-info" aria-hidden />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-base-content truncate mb-1" title={d.title}>
                                                            {d.title.slice(0, 30) || '(Untitled Document)'}
                                                        </div>
                                                        <div className="text-xs text-base-content/60">
                                                            ID: {d.id.slice(0, 8)}...
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    {d.site_name ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-success/10 rounded-lg flex items-center justify-center">
                                                                <i className="fa-duotone fa-solid fa-globe text-xs text-success" aria-hidden />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-sm text-base-content">{d.site_name}</div>
                                                                <div className="text-xs text-base-content/60">{d.site_domain}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-base-300/60 rounded-lg flex items-center justify-center">
                                                                <i className="fa-duotone fa-solid fa-question text-xs text-base-content/40" aria-hidden />
                                                            </div>
                                                            <span className="text-base-content/40 text-sm">No site assigned</span>
                                                        </div>
                                                    )}
                                                    {(d.source_title || d.source_kind) && (
                                                        <div className="text-xs text-base-content/60 pl-8">
                                                            Source: {d.source_title || `${d.source_kind} import`}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <a
                                                    className="text-primary hover:text-primary/80 text-sm font-medium transition-colors flex items-center gap-2 max-w-xs group/link"
                                                    href={d.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title={d.url}
                                                >
                                                    <span className="truncate">{d.url}</span>
                                                    <i className="fa-duotone fa-solid fa-external-link text-xs opacity-60 group-hover/link:opacity-100 transition-opacity flex-shrink-0" aria-hidden />
                                                </a>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-base-content/70">
                                                    {new Date(d.created_at).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: new Date(d.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                                    })}
                                                </div>
                                                <div className="text-xs text-base-content/50 mt-1">
                                                    {new Date(d.created_at).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <DeleteButton id={d.id} tenantId={tenantId} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="lg:hidden">
                        <div className="p-6 border-b border-base-200/60">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-base-content">Documents</h3>
                                    <p className="text-sm text-base-content/60">{docs.length} items in knowledge base</p>
                                </div>
                                <HoverScale scale={1.05}>
                                    <button className="btn btn-sm btn-ghost">
                                        <i className="fa-duotone fa-solid fa-filter text-xs" aria-hidden />
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            {docs.map((d) => (
                                <DocumentCard key={d.id} doc={d} tenantId={tenantId} />
                            ))}
                        </div>
                    </div>
                </div>
            </StaggerChild>
        </StaggerContainer>
    );
}

function DocumentCard({ doc, tenantId }: { doc: DocRow; tenantId: string }) {
    return (
        <HoverScale scale={1.01}>
            <div className="bg-base-200/40 rounded-xl border border-base-300/40 p-4 hover:bg-base-200/60 transition-all duration-200">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <i className="fa-duotone fa-solid fa-file-lines text-info" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-base-content line-clamp-2 flex-1" title={doc.title}>
                                {doc.title || '(Untitled Document)'}
                            </h4>
                            <DeleteButton id={doc.id} tenantId={tenantId} size="sm" />
                        </div>

                        <div className="space-y-2 text-sm">
                            {doc.site_name && (
                                <div className="flex items-center gap-2">
                                    <i className="fa-duotone fa-solid fa-globe text-xs text-success" aria-hidden />
                                    <span className="text-base-content/70">{doc.site_name}</span>
                                </div>
                            )}
                            <a
                                className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group"
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <i className="fa-duotone fa-solid fa-link text-xs" aria-hidden />
                                <span className="truncate">{doc.url}</span>
                                <i className="fa-duotone fa-solid fa-external-link text-xs opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden />
                            </a>
                            <div className="flex items-center gap-2 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-clock text-xs" aria-hidden />
                                <span>Added {new Date(doc.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: new Date(doc.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </HoverScale>
    );
}

async function DocumentsStats({ tenantId }: { tenantId: string }) {
    try {
        const statsQuery = await query<{
            total_docs: number;
            sites_count: number;
            avg_docs_per_site: number;
            last_added: string;
        }>(
            `SELECT 
                COUNT(d.id)::int as total_docs,
                COUNT(DISTINCT d.site_id)::int as sites_count,
                CASE 
                    WHEN COUNT(DISTINCT d.site_id) > 0 
                    THEN ROUND(COUNT(d.id)::numeric / COUNT(DISTINCT d.site_id), 1)::numeric
                    ELSE 0 
                END as avg_docs_per_site,
                MAX(d.created_at) as last_added
            FROM public.documents d 
            WHERE d.tenant_id = $1`,
            [tenantId]
        );

        const stats = statsQuery.rows[0];

        return (
            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-figure text-info">
                        <i className="fa-duotone fa-solid fa-book-open text-2xl" aria-hidden />
                    </div>
                    <div className="stat-title">Knowledge Base</div>
                    <div className="stat-value text-info text-lg">{stats.total_docs}</div>
                    <div className="stat-desc">Across {stats.sites_count} sites</div>
                </div>
            </div>
        );
    } catch {
        return (
            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-figure text-info">
                        <i className="fa-duotone fa-solid fa-book-open text-2xl" aria-hidden />
                    </div>
                    <div className="stat-title">Knowledge Base</div>
                    <div className="stat-value text-info text-lg">0</div>
                    <div className="stat-desc">No documents yet</div>
                </div>
            </div>
        );
    }
}

export default async function DocumentsPage() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true })

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Documents", icon: "fa-file-lines" }
    ];

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
                        <div className="flex flex-col gap-6">
                            {/* Title and Description */}
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-base-content">Knowledge Base</h1>
                                    <p className="text-base-content/60 mt-2">
                                        Manage your AI training content from websites, documents, and manual sources
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <DocumentsStats tenantId={tenantId} />
                                    <HoverScale scale={1.02}>
                                        <a href="/dashboard/sources" className="btn btn-outline btn-sm">
                                            <i className="fa-duotone fa-solid fa-database mr-2" aria-hidden />
                                            Manage Sources
                                        </a>
                                    </HoverScale>
                                </div>
                            </div>
                            <IngestForm tenantId={tenantId} />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Filters & Search */}
                <StaggerContainer>
                    <StaggerChild>
                        <DocumentsFilters tenantId={tenantId} />
                    </StaggerChild>
                </StaggerContainer>



                {/* Content */}
                <Suspense fallback={
                    <div className="space-y-4">
                        <TableSkeleton rows={5} columns={4} />
                    </div>
                }>
                    <DocumentsContent tenantId={tenantId} />
                </Suspense>
            </div>
        </AnimatedPage>
    )
}

async function DocumentsContent({ tenantId }: { tenantId: string }) {
    const docs = await getDocs(tenantId);
    return <DocumentsTable docs={docs} tenantId={tenantId} />;
}

function DeleteButton({ id, tenantId, size = "md" }: { id: string; tenantId: string; size?: "sm" | "md" }) {
    async function action() {
        'use server'
        try {
            const res = await fetch(`${process.env.SITE_URL || ''}/api/documents/${id}`, {
                method: 'DELETE',
                headers: { 'x-tenant-id': tenantId }
            });

            if (!res.ok) {
                throw new Error('Failed to delete document');
            }
        } catch (error) {
            console.error('Delete error:', error);
            // Note: Server actions can't directly show toasts, this would need client-side handling
        }
    }

    return (
        <form action={action}>
            <HoverScale scale={1.05}>
                <button
                    type="submit"
                    className={`${size === "sm" ? "w-9 h-9" : "w-10 h-10"} rounded-lg bg-error/10 hover:bg-error/20 border border-error/20 hover:border-error/30 text-error hover:text-error/80 flex items-center justify-center transition-all duration-200 group`}
                    aria-label="Delete document"
                    title="Delete document"
                >
                    <i className={`fa-duotone fa-solid fa-trash ${size === "sm" ? "text-sm" : "text-base"} group-hover:scale-110 transition-transform`} aria-hidden />
                </button>
            </HoverScale>
        </form>
    )
}

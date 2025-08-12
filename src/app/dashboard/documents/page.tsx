import { getTenantIdServer } from "@/lib/auth";
import { query } from "@/lib/db";
import IngestForm from "@/components/ingest-form";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale, FadeIn } from "@/components/ui/animated-page";
import { Suspense } from "react";

export const runtime = 'nodejs'

type DocRow = { id: string; url: string; title: string; created_at: string }

async function getDocs(tenantId: string) {
    const { rows } = await query<DocRow>(
        `select id, url, title, created_at from public.documents where tenant_id=$1 order by created_at desc limit 100`,
        [tenantId]
    )
    return rows
}

function DocumentsTable({ docs, tenantId }: { docs: DocRow[]; tenantId: string }) {
    if (docs.length === 0) {
        return (
            <FadeIn>
                <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <i className="fa-duotone fa-solid fa-file-lines text-3xl text-primary" aria-hidden />
                        </div>
                        <h3 className="text-xl font-semibold text-base-content mb-3">No documents yet</h3>
                        <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                            Start building your knowledge base by adding website URLs or sitemaps. Your AI will use this content to provide better support.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
                            <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
                            <span>Try adding your help docs or knowledge base URLs</span>
                        </div>
                    </div>
                </div>
            </FadeIn>
        );
    }

    return (
        <StaggerContainer>
            {/* Desktop Table */}
            <StaggerChild>
                <div className="hidden lg:block bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">Document Library</h3>
                                <p className="text-sm text-base-content/60">Your imported knowledge base content</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-base-content/60">
                                <i className="fa-duotone fa-solid fa-database text-xs" aria-hidden />
                                <span>{docs.length} documents</span>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-base-200/60">
                            <table className="w-full">
                                <thead className="bg-base-200/40">
                                    <tr>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-1/3">Title</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-1/2">Source URL</th>
                                        <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-32">Added</th>
                                        <th className="text-right p-4 text-sm font-semibold text-base-content/80 w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-base-200/60">
                                    {docs.map((d, index) => (
                                        <HoverScale key={d.id} scale={1.005}>
                                            <tr className="hover:bg-base-200/30 transition-colors duration-200">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <i className="fa-duotone fa-solid fa-file-lines text-sm text-info" aria-hidden />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium text-sm text-base-content truncate" title={d.title}>
                                                                {d.title || '(Untitled Document)'}
                                                            </div>
                                                            <div className="text-xs text-base-content/60 mt-0.5">
                                                                Document #{index + 1}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <a 
                                                        className="text-primary hover:text-primary/80 text-sm font-medium truncate block max-w-xs transition-colors" 
                                                        href={d.url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        title={d.url}
                                                    >
                                                        {d.url}
                                                        <i className="fa-duotone fa-solid fa-external-link text-xs ml-1 opacity-60" aria-hidden />
                                                    </a>
                                                </td>
                                                <td className="p-4 text-sm text-base-content/70">
                                                    {new Date(d.created_at).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <DeleteButton id={d.id} tenantId={tenantId} />
                                                </td>
                                            </tr>
                                        </HoverScale>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </StaggerChild>

            {/* Mobile/Tablet Cards */}
            <StaggerChild>
                <div className="lg:hidden space-y-4">
                    {docs.map((d, index) => (
                        <HoverScale key={d.id} scale={1.02}>
                            <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-file-lines text-info" aria-hidden />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-base-content line-clamp-2 mb-1" title={d.title}>
                                                    {d.title || '(Untitled Document)'}
                                                </h3>
                                                <div className="text-sm text-base-content/60">
                                                    Document #{index + 1} • Added {new Date(d.created_at).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <DeleteButton id={d.id} tenantId={tenantId} size="sm" />
                                    </div>
                                    
                                    <div className="bg-base-200/40 rounded-xl p-3 border border-base-300/40">
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-link text-xs text-base-content/60" aria-hidden />
                                            <span className="text-xs font-medium text-base-content/60 uppercase tracking-wide">Source URL</span>
                                        </div>
                                        <a 
                                            className="text-primary hover:text-primary/80 text-sm font-medium break-all transition-colors flex items-center gap-2" 
                                            href={d.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                        >
                                            <span className="flex-1">{d.url}</span>
                                            <i className="fa-duotone fa-solid fa-external-link text-xs opacity-60 flex-shrink-0" aria-hidden />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </HoverScale>
                    ))}
                </div>
            </StaggerChild>
        </StaggerContainer>
    );
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
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Documents</h1>
                                <p className="text-base-content/60 mt-2">
                                    Manage your knowledge base content and data sources for AI training
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <IngestForm tenantId={tenantId} />
                            </div>
                        </div>
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

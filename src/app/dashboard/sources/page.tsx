import { getTenantIdStrict } from "@/lib/tenant-resolve";
import SourcesTable from "@/components/sources-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { query } from "@/lib/db";
import { Suspense } from "react";
import FilterControls from "./filter-controls";
import StatCard from "@/components/ui/stat-card";

export const runtime = 'nodejs';

interface Filters {
    site?: string;
    status?: string;
    type?: string;
    search?: string;
}

function buildConditions(tenantId: string, filters: Filters) {
    const conditions: string[] = ['s.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.site) {
        conditions.push(`s.site_id = $${idx}`);
        params.push(filters.site);
        idx++;
    }

    if (filters.status) {
        conditions.push(`s.status = $${idx}`);
        params.push(filters.status);
        idx++;
    }

    if (filters.type) {
        conditions.push(`s.kind = $${idx}`);
        params.push(filters.type);
        idx++;
    }

    if (filters.search) {
        conditions.push(`(
            s.url ILIKE $${idx} OR 
            s.title ILIKE $${idx}
        )`);
        params.push(`%${filters.search}%`);
        idx++;
    }

    return { where: conditions.join(' AND '), params };
}

async function getSourcesStats(tenantId: string, filters: Filters = {}) {
    try {
        const { where, params } = buildConditions(tenantId, filters);

        const statsQuery = await query<{
            total_sources: number;
            total_documents: number;
            crawling_count: number;
            ready_count: number;
        }>(
            `SELECT 
                COUNT(DISTINCT s.id)::int as total_sources,
                COUNT(DISTINCT d.id)::int as total_documents,
                COUNT(DISTINCT CASE WHEN s.status = 'crawling' THEN s.id END)::int as crawling_count,
                COUNT(DISTINCT CASE WHEN s.status = 'ready' THEN s.id END)::int as ready_count
            FROM public.sources s
            LEFT JOIN public.documents d ON d.source_id = s.id
            WHERE ${where}`,
            params
        );

        return statsQuery.rows[0] || {
            total_sources: 0,
            total_documents: 0,
            crawling_count: 0,
            ready_count: 0
        };
    } catch (error) {
        console.error('Error fetching sources stats:', error);
        return {
            total_sources: 0,
            total_documents: 0,
            crawling_count: 0,
            ready_count: 0
        };
    }
}

async function listSites(tenantId: string) {
    try {
        const { rows } = await query<{ id: string; domain: string; name: string }>(
            `SELECT id, domain, name 
             FROM public.tenant_sites 
             WHERE tenant_id=$1 
             ORDER BY name ASC`,
            [tenantId]
        );
        return rows;
    } catch (error) {
        console.error('Error fetching sites:', error);
        return [];
    }
}

export default async function SourcesPage({
    searchParams
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const resolved = await searchParams;
    const filters: Filters = {
        site: typeof resolved.site === 'string' ? resolved.site : undefined,
        status: typeof resolved.status === 'string' ? resolved.status : undefined,
        type: typeof resolved.type === 'string' ? resolved.type : undefined,
        search: typeof resolved.search === 'string' ? resolved.search : undefined
    };

    const tenantId = await getTenantIdStrict();
    const [stats, sites] = await Promise.all([
        getSourcesStats(tenantId, filters),
        listSites(tenantId)
    ]);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Sites", href: "/dashboard/sites", icon: "fa-globe" },
        { label: "Sources", icon: "fa-database" }
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
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Content Sources</h1>
                                <p className="text-base-content/60 mt-2">
                                    Manage your knowledge base sources and content ingestion pipelines
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <FilterControls filters={filters} sites={sites} />
                                <HoverScale scale={1.02}>
                                    <a href="/dashboard/documents" className="btn btn-outline btn-secondary btn-sm rounded-lg">
                                        <i className="fa-duotone fa-solid fa-file-lines mr-2" aria-hidden />
                                        View Documents
                                    </a>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Stats Overview */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            <HoverScale scale={1.01}>
                                <StatCard
                                    title="Total Sources"
                                    value={stats.total_sources}
                                    icon="fa-database"
                                    color="primary"
                                    description="linked to sites"
                                />
                            </HoverScale>

                            <HoverScale scale={1.01}>
                                <StatCard
                                    title="Ready"
                                    value={stats.ready_count}
                                    icon="fa-check-circle"
                                    color="success"
                                    description="sources ready"
                                />
                            </HoverScale>
                            <HoverScale scale={1.01}>
                                <StatCard
                                    title="Crawling"
                                    value={stats.crawling_count}
                                    icon="fa-spinner"
                                    color="warning"
                                    description="sources crawling"
                                />
                            </HoverScale>

                            <HoverScale scale={1.01}>
                                <StatCard
                                    title="Content Documents"
                                    value={stats.total_documents}
                                    icon="fa-file-text"
                                    color="info"
                                    description="documents indexed"
                                />
                            </HoverScale>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <StaggerContainer>
                    <StaggerChild>
                        <SourcesTable initialFilters={filters} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Help Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-lightbulb text-lg text-primary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Content Source Types</h2>
                                        <p className="text-base-content/60 text-sm">Understanding different ways to add content</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-link text-primary" aria-hidden />
                                            <h3 className="font-semibold">Single Page</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Crawl individual web pages for content. Perfect for specific documentation pages or articles.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-info">
                                            <i className="fa-duotone fa-solid fa-clock" aria-hidden />
                                            <span>Quick setup</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-sitemap text-primary" aria-hidden />
                                            <h3 className="font-semibold">Sitemap</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Automatically discover and crawl multiple pages from a sitemap.xml file. Ideal for comprehensive sites.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-success">
                                            <i className="fa-duotone fa-solid fa-globe" aria-hidden />
                                            <span>Bulk content</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-file-pdf text-primary" aria-hidden />
                                            <h3 className="font-semibold">PDF Document</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Upload and process PDF documents. Great for manuals, guides, and technical documentation.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-warning">
                                            <i className="fa-duotone fa-solid fa-upload" aria-hidden />
                                            <span>Coming soon</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-edit text-primary" aria-hidden />
                                            <h3 className="font-semibold">Manual Entry</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Manually add content that isn&apos;t available online. Perfect for internal knowledge and FAQs.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-info">
                                            <i className="fa-duotone fa-solid fa-pen" aria-hidden />
                                            <span>Custom content</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-base-200/40 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-info/20 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <i className="fa-duotone fa-solid fa-info text-xs text-info" aria-hidden />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Site-Specific Knowledge</h4>
                                            <p className="text-sm text-base-content/70">
                                                When you associate a source with a specific site, that content will be prioritized when answering questions from that site&apos;s chat widget.
                                                This allows you to provide targeted, site-specific information to your users.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <HoverScale scale={1.02}>
                                        <a href="/dashboard/documents" className="btn btn-outline btn-sm rounded-lg">
                                            <i className="fa-duotone fa-solid fa-file-lines mr-2" aria-hidden />
                                            View Documents
                                        </a>
                                    </HoverScale>
                                    <HoverScale scale={1.02}>
                                        <a href="/dashboard/sites" className="btn btn-outline btn-sm rounded-lg">
                                            <i className="fa-duotone fa-solid fa-globe mr-2" aria-hidden />
                                            Manage Sites
                                        </a>
                                    </HoverScale>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

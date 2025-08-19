import { getTenantIdStrict } from "@/lib/tenant-resolve";
import SourcesTable from "@/components/sources-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { query } from "@/lib/db";

export const runtime = 'nodejs';

async function getSourcesStats(tenantId: string) {
    try {
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
            WHERE s.tenant_id = $1`,
            [tenantId]
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

export default async function SourcesPage() {
    const tenantId = await getTenantIdStrict();
    const stats = await getSourcesStats(tenantId);

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <HoverScale scale={1.01}>
                                <div className="stats shadow hover:shadow-md transition-all duration-300 w-full rounded-2xl">
                                    <div className="stat bg-base-100 rounded-2xl">
                                        <div className="stat-title">Total Sources</div>
                                        <div className="stat-figure">
                                            <div className="bg-primary/20 rounded-2xl h-12 w-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-database text-lg text-primary" aria-hidden />
                                            </div>
                                        </div>
                                        <div className="stat-value text-primary">
                                            {stats.total_sources}
                                        </div>
                                    </div>
                                </div>
                            </HoverScale>

                            <HoverScale scale={1.01}>
                                <div className="stats shadow hover:shadow-md transition-all duration-300 w-full">
                                    <div className="stat bg-base-100 rounded-2xl">
                                        <div className="stat-title">Ready</div>
                                        <div className="stat-figure">
                                            <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-check-circle text-lg text-success" aria-hidden />
                                            </div>
                                        </div>
                                        <div className="stat-value text-success">
                                            {stats.ready_count}
                                        </div>
                                    </div>
                                </div>
                            </HoverScale>

                            <HoverScale scale={1.01}>
                                <div className="stats shadow hover:shadow-md transition-all duration-300 w-full">
                                    <div className="stat bg-base-100 rounded-2xl">
                                        <div className="stat-title">Crawling</div>
                                        <div className="stat-figure">
                                            <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-spinner text-lg text-warning" aria-hidden />
                                            </div>
                                        </div>
                                        <div className="stat-value text-warning">
                                            {stats.crawling_count}
                                        </div>
                                    </div>
                                </div>
                            </HoverScale>

                            <HoverScale scale={1.01}>
                                <div className="stats shadow hover:shadow-md transition-all duration-300 w-full">
                                    <div className="stat bg-base-100 rounded-2xl">
                                        <div className="stat-title">Total Documents</div>
                                        <div className="stat-figure">
                                            <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                                                <i className="fa-duotone fa-solid fa-file-text text-lg text-info" aria-hidden />
                                            </div>
                                        </div>
                                        <div className="stat-value text-info">
                                            {stats.total_documents}
                                        </div>
                                    </div>
                                </div>
                            </HoverScale>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <StaggerContainer>
                    <StaggerChild>
                        <SourcesTable />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
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

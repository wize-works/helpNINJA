import { Suspense } from "react";
import { query } from "@/lib/db";
import { getTenantIdStrict } from "@/lib/tenant-resolve";
import FilterControls from "./filter-controls";
import RulesContent from "./rules-content";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";

interface Filters {
    search?: string;
    enabled?: string;
    type?: string;
    siteId?: string;
}

interface SiteOption {
    id: string;
    name: string;
    domain: string;
}

// Fetch sites for filter dropdown
async function fetchSites(tenantId: string): Promise<SiteOption[]> {
    const { rows } = await query<SiteOption>(
        `SELECT id, name, domain FROM public.tenant_sites 
         WHERE tenant_id = $1 AND verified = true 
         ORDER BY name`,
        [tenantId]
    );
    return rows;
}

const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
    { label: "Conversations", href: "/dashboard/conversations", icon: "fa-comments" },
    { label: "Escalation Rules", icon: "fa-route" }
];

export default async function RulesPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Parse filters from URL search params
    const params = await searchParams;
    const filters: Filters = {
        search: typeof params.search === 'string' ? params.search : undefined,
        enabled: typeof params.enabled === 'string' ? params.enabled : undefined,
        type: typeof params.type === 'string' ? params.type : undefined,
        siteId: typeof params.siteId === 'string' ? params.siteId : undefined,
    };

    const tenantId = await getTenantIdStrict();
    const sites = await fetchSites(tenantId);

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header with filter controls */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Escalation Rules</h1>
                                <p className="text-base-content/60 mt-2">
                                    Automate escalation and routing based on conversation context, confidence, and other conditions
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <FilterControls filters={filters} sites={sites} />
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <Suspense fallback={<LoadingSkeleton />}>
                    <RulesContent tenantId={tenantId} filters={filters} />
                </Suspense>

                {/* Help Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-lightbulb text-lg text-primary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-base-content">How Escalation Rules Work</h2>
                                        <p className="text-base-content/60 text-sm">Understand the key concepts behind our rule engine</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-filter text-primary" aria-hidden />
                                            <h3 className="font-semibold">Conditions</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Set up conditions based on confidence score, keywords, time of day, user email domain, and more.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-paper-plane text-primary" aria-hidden />
                                            <h3 className="font-semibold">Actions</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Route to integrations like Slack or email, send webhooks, or trigger notifications when conditions are met.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-chart-line text-primary" aria-hidden />
                                            <h3 className="font-semibold">Priority</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Rules are evaluated in priority order (highest first), so important escalations happen before general routing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

// Loading skeleton component
function LoadingSkeleton() {
    return (
        <div className="bg-gradient-to-br from-base-100/60 to-base-200/40 backdrop-blur-sm rounded-2xl border border-base-200/60 shadow-sm">
            <div className="p-8 space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="animate-pulse bg-base-300/60 h-20 rounded-xl"></div>
                ))}
            </div>
        </div>
    );
}

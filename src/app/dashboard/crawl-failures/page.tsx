import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { CrawlFailuresDashboard } from '@/components/crawl-failures-dashboard';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CrawlFailuresPage() {
    const tenantId = await getTenantIdStrict();

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Crawl Failures", icon: "fa-exclamation-triangle" }
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
                                <h1 className="text-3xl font-bold text-base-content">Crawl Failures</h1>
                                <p className="text-base-content/60 mt-2">
                                    Monitor and manage ingestion failures with detailed tracking and retry capabilities
                                </p>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Failures Dashboard */}
                <StaggerContainer>
                    <StaggerChild>
                        <CrawlFailuresDashboard tenantId={tenantId} />
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}
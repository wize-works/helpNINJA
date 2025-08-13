import { getTenantIdServer } from "@/lib/auth";
import SiteManager from "@/components/site-manager";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import StatCard from "@/components/ui/stat-card";
import { query } from "@/lib/db";

export const runtime = 'nodejs';

async function getSitesStats(tenantId: string) {
    console.log('getSitesStats called with tenantId:', tenantId);

    try {
        // First, let's check if we have any tenant_sites at all
        const siteCheck = await query(
            'SELECT COUNT(*) as count FROM public.tenant_sites WHERE tenant_id = $1',
            [tenantId]
        );
        console.log('Site check result:', siteCheck.rows);

        const statsQuery = await query<{
            total_sites: number;
            verified_sites: number;
            pending_sites: number;
            active_sites: number;
            total_documents: number;
            total_sources: number;
        }>(
            `SELECT 
                COUNT(DISTINCT s.id)::int as total_sites,
                COUNT(DISTINCT CASE WHEN s.verified = true THEN s.id END)::int as verified_sites,
                COUNT(DISTINCT CASE WHEN s.verified = false THEN s.id END)::int as pending_sites,
                COUNT(DISTINCT CASE WHEN s.verified = true THEN s.id END)::int as active_sites,
                COUNT(DISTINCT d.id)::int as total_documents,
                COUNT(DISTINCT src.id)::int as total_sources
            FROM public.tenant_sites s
            LEFT JOIN public.documents d ON d.site_id = s.id  
            LEFT JOIN public.sources src ON src.site_id = s.id
            WHERE s.tenant_id = $1`,
            [tenantId]
        );

        console.log('Stats query result:', statsQuery.rows[0]);

        return statsQuery.rows[0] || {
            total_sites: 0,
            verified_sites: 0,
            pending_sites: 0,
            active_sites: 0,
            total_documents: 0,
            total_sources: 0,
        };
    } catch (error) {
        console.error('Error fetching sites stats:', error);
        return {
            total_sites: 0,
            verified_sites: 0,
            pending_sites: 0,
            active_sites: 0,
            total_documents: 0,
            total_sources: 0,
        };
    }
}

export default async function SitesPage() {
    const tenantId = await getTenantIdServer({ allowEnvFallback: true });
    console.log('SitesPage tenantId resolved:', tenantId);
    const stats = await getSitesStats(tenantId);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Sites", icon: "fa-globe" }
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
                                <h1 className="text-3xl font-bold text-base-content">Website Management</h1>
                                <p className="text-base-content/60 mt-2">
                                    Register and manage the domains where your chat widget can be embedded. Domain verification ensures security and prevents unauthorized use.
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-figure text-primary">
                                            <i className="fa-duotone fa-solid fa-shield-check text-2xl" aria-hidden />
                                        </div>
                                        <div className="stat-title">Security</div>
                                        <div className="stat-value text-primary text-lg">Verified</div>
                                        <div className="stat-desc">Domain-protected widget</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Site Stats */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Total Sites"
                                value={stats.total_sites}
                                icon="fa-globe"
                                color="primary"
                                subtitle={stats.total_sites === 1 ? "domain registered" : "domains registered"}
                            />

                            <StatCard
                                title="Verified"
                                value={stats.verified_sites}
                                icon="fa-shield-check"
                                color="success"
                                subtitle="domains verified"
                            />

                            <StatCard
                                title="Pending"
                                value={stats.pending_sites}
                                icon="fa-clock"
                                color="warning"
                                subtitle="awaiting verification"
                            />

                            <StatCard
                                title="Content Sources"
                                value={stats.total_sources}
                                icon="fa-database"
                                color="info"
                                subtitle="linked to sites"
                            />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Content */}
                    <div className="lg:col-span-2">
                        <StaggerContainer>
                            <StaggerChild>
                                <SiteManager tenantId={tenantId} />
                            </StaggerChild>
                        </StaggerContainer>
                    </div>

                    {/* Help Section */}
                    <div className="">
                        <StaggerContainer>
                            <StaggerChild>
                                <div className="card bg-base-100 rounded-2xl shadow-sm">
                                    <div className="p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                                <i className="fa-duotone fa-solid fa-lightbulb text-lg text-primary" aria-hidden />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-base-content">Getting Started with Sites</h2>
                                                <p className="text-base-content/60 text-sm">Follow these steps to set up your chat widget</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                            <div>
                                                <h3 className="font-semibold mb-2">1. Add Your Website</h3>
                                                <p className="text-sm text-base-content/70 mb-3">
                                                    Register each domain where you want to use the chat widget. Examples: jobsight.co, kanninja.com, microsoft.com
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-success">
                                                    <i className="fa-duotone fa-solid fa-check" aria-hidden />
                                                    <span>Multiple domains supported</span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-semibold mb-2">2. Verify Domain Ownership</h3>
                                                <p className="text-sm text-base-content/70 mb-3">
                                                    Choose from 3 verification methods: HTML meta tag, DNS record, or file upload. This proves you own the domain.
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-warning">
                                                    <i className="fa-duotone fa-solid fa-shield-check" aria-hidden />
                                                    <span>Recommended for security</span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-semibold mb-2">3. Install Widget Code</h3>
                                                <p className="text-sm text-base-content/70 mb-3">
                                                    Copy the widget script and add it to your website&apos;s HTML. The widget will only work on verified domains.
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-info">
                                                    <i className="fa-duotone fa-solid fa-code" aria-hidden />
                                                    <span>One-time setup per site</span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-semibold mb-2">4. Test & Monitor</h3>
                                                <p className="text-sm text-base-content/70 mb-3">
                                                    Use the live preview to test your widget, then monitor conversations and analytics in the dashboard.
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-primary">
                                                    <i className="fa-duotone fa-solid fa-chart-line" aria-hidden />
                                                    <span>Real-time analytics</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex gap-3">
                                            <HoverScale scale={1.02}>
                                                <a href="/onboarding" className="btn btn-outline btn-sm">
                                                    <i className="fa-duotone fa-solid fa-graduation-cap mr-2" aria-hidden />
                                                    Setup Guide
                                                </a>
                                            </HoverScale>
                                            <HoverScale scale={1.02}>
                                                <a href="/dashboard/settings" className="btn btn-outline btn-sm">
                                                    <i className="fa-duotone fa-solid fa-eye mr-2" aria-hidden />
                                                    Widget Preview
                                                </a>
                                            </HoverScale>
                                        </div>
                                    </div>
                                </div>
                            </StaggerChild>
                        </StaggerContainer>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
}

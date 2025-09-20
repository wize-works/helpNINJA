import { Suspense } from 'react';
import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';
import FilterControls from './filter-controls';
import EventsContent from './events-content';
import StatCard from '@/components/ui/stat-card';

export const runtime = 'nodejs';

interface SearchParams {
    search?: string;
    event?: string;
    dateRange?: string;
}

interface Props {
    searchParams: Promise<SearchParams>;
}

export default async function EventsPage({ searchParams }: Props) {
    const params = await searchParams;
    const { search, event, dateRange } = params;
    const tenantId = await getTenantIdStrict();

    const breadcrumbItems = [
        { label: 'Dashboard', href: '/dashboard', icon: 'fa-gauge-high' },
        { label: 'Events', icon: 'fa-waveform-lines' }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-base-content">Event Stream</h1>
                                <p className="text-base-content/60 mt-2">Recent analytics & audit events for your workspace</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <FilterControls filters={{ search, event, dateRange }} />
                                <HoverScale scale={1.02}>
                                    <a href="/dashboard/analytics" className="btn btn-primary rounded-xl">
                                        <i className="fa-duotone fa-solid fa-chart-line mr-2" aria-hidden />
                                        Analytics
                                    </a>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <StaggerChild>
                        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
                            <StatCard title="Total Events" value="1,234" description="Events in the last 30 days" icon="fa-waveform-lines" color="primary" />
                            <StatCard title="Unique Users" value="567" description="Users generating events" icon="fa-users" color="secondary" />
                            <StatCard title="Error Events" value="45" description="Events with errors" icon="fa-triangle-exclamation" color="warning" />
                            <StatCard title="Avg. Events/User" value="2.17" description="Average events per user" icon="fa-user-chart" color="info" />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
                            <div className="card-body p-0">
                                <Suspense fallback={
                                    <div className="flex items-center justify-center py-12">
                                        <div className="loading loading-spinner loading-md"></div>
                                    </div>
                                }>
                                    <EventsContent
                                        search={search}
                                        event={event}
                                        dateRange={dateRange}
                                        tenantId={tenantId}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 border border-base-300 rounded-2xl">
                            <div className="card-body">
                                <h2 className="card-title">
                                    <i className="fa-duotone fa-solid fa-lightbulb mr-2 text-primary" aria-hidden />
                                    About Events
                                </h2>
                                <p className="text-sm text-base-content/70 mb-4">
                                    This stream captures structured events (conversation lifecycle, escalations, ingestion, billing, integrations, quotas) for analytics & audit. Payloads are capped & sanitized.
                                </p>
                                <ul className="text-sm text-base-content/70 space-y-1">
                                    <li>• Use Analytics for aggregates & trends</li>
                                    <li>• Use this stream for debugging mismatched counts or sequence order</li>
                                    <li>• Extend safely via <code className="font-mono">src/lib/events.ts</code> enum</li>
                                </ul>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

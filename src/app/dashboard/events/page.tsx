import { getTenantIdStrict } from '@/lib/tenant-resolve';
import { query } from '@/lib/db';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';

export const runtime = 'nodejs';

type EventRow = { id: string; name: string; data: unknown; created_at: string };

async function loadEvents(tenantId: string): Promise<EventRow[]> {
    const { rows } = await query<EventRow>(
        `SELECT id::text, name, data, created_at::text
     FROM public.events
     WHERE tenant_id=$1
     ORDER BY created_at DESC
     LIMIT 200`,
        [tenantId]
    );
    return rows;
}

export default async function EventsPage() {
    const tenantId = await getTenantIdStrict();
    const events = await loadEvents(tenantId);

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
                                <p className="text-base-content/60 mt-2">Recent analytics & audit events for your workspace (last 200)</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <HoverScale scale={1.02}>
                                    <a href="/dashboard/analytics" className="btn btn-outline btn-sm rounded-lg">
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
                        <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
                            <div className="card-body p-0 overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th className="w-40">Time</th>
                                            <th className="w-56">Event</th>
                                            <th>Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="text-center py-10 text-base-content/60">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-14 h-14 rounded-xl bg-base-200 flex items-center justify-center">
                                                            <i className="fa-duotone fa-solid fa-waveform-lines text-xl text-base-content/40" aria-hidden />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">No events yet</p>
                                                            <p className="text-xs text-base-content/50">Events will appear as users interact & data ingests</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {events.map(ev => {
                                            const ts = new Date(ev.created_at);
                                            return (
                                                <tr key={ev.id} className="hover">
                                                    <td className="align-top whitespace-nowrap text-xs text-base-content/70">
                                                        {ts.toLocaleString()}
                                                    </td>
                                                    <td className="align-top">
                                                        <span className="badge badge-outline badge-sm font-mono uppercase tracking-wide">
                                                            {ev.name}
                                                        </span>
                                                    </td>
                                                    <td className="align-top font-mono text-xs whitespace-pre-wrap max-w-[0]">
                                                        <pre className="m-0 p-0 leading-snug overflow-x-auto max-w-xl">
                                                            {JSON.stringify(ev.data as Record<string, unknown>, null, 2)}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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

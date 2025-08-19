import { getTenantIdStrict } from "@/lib/tenant-resolve";
import OutboxTable from "@/components/outbox-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";

export const runtime = 'nodejs';

export default async function OutboxPage() {
    await getTenantIdStrict();

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Conversations", href: "/dashboard/conversations", icon: "fa-comments" },
        { label: "Delivery Status", icon: "fa-inbox" }
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
                                <h1 className="text-3xl font-bold text-base-content">Delivery Status</h1>
                                <p className="text-base-content/60 mt-2">
                                    Monitor escalation delivery attempts, retry failed deliveries, and track integration performance
                                </p>
                            </div>
                            <div className="flex-shrink-0">
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-figure text-primary">
                                            <i className="fa-duotone fa-solid fa-paper-plane text-2xl" aria-hidden />
                                        </div>
                                        <div className="stat-title">Delivery</div>
                                        <div className="stat-value text-primary text-lg">Outbox</div>
                                        <div className="stat-desc">Integration monitoring</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <StaggerContainer>
                    <StaggerChild>
                        <OutboxTable />
                    </StaggerChild>
                </StaggerContainer>

                {/* Help Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-2xl">
                            <div className="card-body">
                                <h2 className="card-title">
                                    <i className="fa-duotone fa-solid fa-lightbulb mr-2 text-primary" aria-hidden />
                                    Understanding Delivery Status
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-check-circle text-success" aria-hidden />
                                            <h3 className="font-semibold">Sent</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Successfully delivered to the integration. The escalation reached its destination and was processed.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-success">
                                            <i className="fa-duotone fa-solid fa-thumbs-up" aria-hidden />
                                            <span>No action needed</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-clock text-warning" aria-hidden />
                                            <h3 className="font-semibold">Pending</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Queued for delivery or currently being processed. Will automatically retry if delivery fails.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-warning">
                                            <i className="fa-duotone fa-solid fa-hourglass" aria-hidden />
                                            <span>Processing...</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-exclamation-circle text-error" aria-hidden />
                                            <h3 className="font-semibold">Failed</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70 mb-3">
                                            Delivery failed after multiple attempts. Check error details and integration settings.
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-error">
                                            <i className="fa-duotone fa-solid fa-tools" aria-hidden />
                                            <span>Needs attention</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-base-200/40 rounded-xl">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-info/20 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <i className="fa-duotone fa-solid fa-info text-xs text-info" aria-hidden />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Troubleshooting Failed Deliveries</h4>
                                            <ul className="text-sm text-base-content/70 space-y-1">
                                                <li>• Check integration credentials and API keys</li>
                                                <li>• Verify webhook URLs are accessible</li>
                                                <li>• Review rate limits and quotas</li>
                                                <li>• Use the retry function for temporary issues</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <a href="/dashboard/integrations" className="btn btn-outline btn-sm">
                                        <i className="fa-duotone fa-solid fa-puzzle-piece mr-2" aria-hidden />
                                        Manage Integrations
                                    </a>
                                    <a href="/dashboard/rules" className="btn btn-outline btn-sm">
                                        <i className="fa-duotone fa-solid fa-route mr-2" aria-hidden />
                                        View Rules
                                    </a>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import ChatWidgetPanel from "@/components/chat-widget-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";
import DefaultWidgetConfigurationWrapper from "@/components/default-widget-configuration-wrapper";

export const runtime = 'nodejs';

type Row = { id: string; name: string; plan: string; plan_status: string; public_key?: string | null; secret_key?: string | null };

async function getTenant(tenantId: string) {
    const { rows } = await query<Row>(
        `select id, name, plan, plan_status, public_key, secret_key
        from public.tenants where id=$1`,
        [tenantId]
    );
    return rows[0];
}

export default async function WidgetPage() {
    const tenantId = await getTenantIdStrict();
    const t = await getTenant(tenantId);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Widget Settings", icon: "fa-comment-alt" }
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
                                <h1 className="text-3xl font-bold text-base-content">Widget Settings</h1>
                                <p className="text-base-content/60 mt-2">
                                    Configure your chat widget appearance, behavior, and integration
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a href="/dashboard/sites" className="btn btn-outline rounded-xl">
                                    <i className="fa-duotone fa-solid fa-globe mr-2" aria-hidden />
                                    Manage Sites
                                </a>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Integration Panel */}
                {t.public_key && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-code text-lg text-primary" aria-hidden />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-base-content">Widget Integration</h2>
                                            <p className="text-base-content/60 text-sm">Add the chat widget to your website</p>
                                        </div>
                                    </div>

                                    <div className="bg-base-200/20 rounded-xl p-4 mb-6">
                                        <h3 className="font-medium text-base-content mb-2">Embed Code</h3>
                                        <p className="text-sm text-base-content/70 mb-4">
                                            Add this code to the <span className="font-mono">&lt;body&gt;</span> of your website. The widget will appear on all pages where this code is present.
                                        </p>

                                        <div className="client-only">
                                            <ChatWidgetPanel tenantPublicKey={t.public_key} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Widget Configuration */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-wand-magic-sparkles text-lg text-secondary" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Widget Configuration</h2>
                                        <p className="text-base-content/60 text-sm">Customize the appearance and behavior of your chat widget</p>
                                    </div>
                                </div>

                                <div className="client-only">
                                    <DefaultWidgetConfigurationWrapper tenantId={tenantId} />
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Best Practices */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 bg-info/10 rounded-2xl flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-lightbulb-on text-lg text-info" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-base-content">Best Practices</h2>
                                        <p className="text-base-content/60 text-sm">Tips for optimizing your chat widget</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-palette mr-2 text-primary" aria-hidden />
                                            Match Your Brand
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            Use your brand colors and style to make the widget feel like a natural part of your website.
                                            Choose a position that doesn&apos;t interfere with important UI elements.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-message-smile mr-2 text-success" aria-hidden />
                                            Personalize Messaging
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            Write a friendly welcome message that sets expectations for what the AI assistant can help with.
                                            Give your assistant a name that fits with your brand voice.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-sitemap mr-2 text-warning" aria-hidden />
                                            Site-Specific Settings
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            For multi-site setups, customize each widget&apos;s configuration to match the specific site&apos;s
                                            audience and purpose. Different sites may need different interaction styles.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-base-200/20 rounded-xl">
                                        <h3 className="font-medium text-base-content mb-2">
                                            <i className="fa-duotone fa-solid fa-book-open mr-2 text-info" aria-hidden />
                                            Better Knowledge Base
                                        </h3>
                                        <p className="text-sm text-base-content/70">
                                            The more quality content you add to your knowledge base, the better your AI assistant will be able to
                                            answer questions. Regularly review and update your content.
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

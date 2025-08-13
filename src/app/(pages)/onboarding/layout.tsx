import { getTenantIdServer } from "@/lib/auth";
import { TenantProvider } from "@/components/tenant-context";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
    // Try to get tenant ID but allow env fallback for new tenant creation
    let tenantId: string = '';
    try {
        tenantId = await getTenantIdServer({ allowEnvFallback: true });
    } catch {
        // No tenant ID available - this is fine for new tenant creation
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
            <TenantProvider tenantId={tenantId}>
                {/* Header */}
                <header className="bg-base-100/80 backdrop-blur-sm border-b border-base-200/60 sticky top-0 z-50">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-comments text-primary-content text-sm" aria-hidden />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-base-content">HelpNinja</h1>
                                    <p className="text-xs text-base-content/60">Setup Wizard</p>
                                </div>
                            </div>
                            <div className="text-sm text-base-content/60">
                                Need help? <a href="mailto:support@helpninja.com" className="link link-primary">Contact Support</a>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="py-8">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-auto py-6 text-center">
                    <div className="text-sm text-base-content/40">
                        © 2024 HelpNinja. All rights reserved.
                    </div>
                </footer>
            </TenantProvider>
        </div>
    );
}

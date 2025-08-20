"use client";

import { useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';
import IntegrationOptions from '@/components/integration-options';
import { useTenant } from '@/components/tenant-context';

interface WidgetSetupModalProps {
    open: boolean;
    onClose: () => void;
    siteId: string;
    siteName: string;
    domain: string;
    verificationToken: string; // Renamed from scriptKey for clarity
}

export default function WidgetSetupModal({
    open,
    onClose,
    siteId,
    siteName,
    domain,
    verificationToken
}: WidgetSetupModalProps) {
    const { tenantInfo } = useTenant();
    const [voice, setVoice] = useState<string>("friendly");

    if (!open) return null;

    const serviceUrl = process.env.NODE_ENV === "production" ? "https://helpninja.app" : "http://localhost:3001";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4">
                <div className="sticky top-0 bg-base-100 border-b border-base-200 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-base-content">Widget Setup</h2>
                            <p className="text-base-content/60 mt-1">Integration instructions for <span className="font-medium">{siteName}</span></p>
                        </div>
                        <button onClick={onClose} className="btn btn-ghost btn-sm rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Site Info */}
                    <div className="bg-gradient-to-r from-base-200/50 to-base-200/20 rounded-xl p-4">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i className="fa-duotone fa-solid fa-globe text-primary" aria-hidden />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-base-content">{siteName}</h3>
                                    <div className="badge badge-success badge-sm">Ready to Install</div>
                                </div>
                                <p className="text-base-content/70 text-sm mt-1 font-mono">{domain}</p>
                            </div>
                        </div>
                    </div>

                    {/* Voice Selection */}
                    <div className="card bg-base-100 rounded-xl shadow-sm border border-base-200/60">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-base-content">
                                    <i className="fa-duotone fa-solid fa-microphone mr-2" aria-hidden />
                                    AI Assistant Voice
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="voice"
                                        value="friendly"
                                        checked={voice === 'friendly'}
                                        onChange={(e) => setVoice(e.target.value)}
                                        className="radio radio-primary radio-sm"
                                    />
                                    <span className="text-sm">Friendly</span>
                                </label>
                                <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="voice"
                                        value="professional"
                                        checked={voice === 'professional'}
                                        onChange={(e) => setVoice(e.target.value)}
                                        className="radio radio-primary radio-sm"
                                    />
                                    <span className="text-sm">Professional</span>
                                </label>
                                <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="voice"
                                        value="casual"
                                        checked={voice === 'casual'}
                                        onChange={(e) => setVoice(e.target.value)}
                                        className="radio radio-primary radio-sm"
                                    />
                                    <span className="text-sm">Casual</span>
                                </label>
                                <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="voice"
                                        value="formal"
                                        checked={voice === 'formal'}
                                        onChange={(e) => setVoice(e.target.value)}
                                        className="radio radio-primary radio-sm"
                                    />
                                    <span className="text-sm">Formal</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Integration Options */}
                    {tenantInfo?.public_key && (
                        <div className="card bg-base-100 rounded-xl shadow-sm border border-base-200/60">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-base-content">
                                        <i className="fa-duotone fa-solid fa-code mr-2" aria-hidden />
                                        Installation Code
                                    </label>
                                </div>
                                {/* Using verificationToken with the correct name */}
                                <IntegrationOptions
                                    tenantPublicKey={tenantInfo.public_key}
                                    siteId={siteId}
                                    verificationToken={verificationToken || ''}
                                    voice={voice}
                                    serviceUrl={serviceUrl}
                                    domain={domain}
                                />
                            </div>
                        </div>
                    )}

                    {/* Installation Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-xl">
                            <div className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <i className="fa-duotone fa-solid fa-list-check text-sm text-warning" aria-hidden />
                                    </div>
                                    <h4 className="font-semibold text-warning">Installation Steps</h4>
                                </div>
                                <ol className="text-sm text-base-content/70 space-y-2 list-decimal list-inside">
                                    <li>Copy the code for your framework</li>
                                    <li>Open your website&apos;s code</li>
                                    <li>Paste the code in the appropriate location</li>
                                    <li>Save and publish your changes</li>
                                </ol>
                            </div>
                        </div>

                        <div className="card bg-gradient-to-r from-success/10 to-success/5 border border-success/20 rounded-xl">
                            <div className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <i className="fa-duotone fa-solid fa-rocket text-sm text-success" aria-hidden />
                                    </div>
                                    <h4 className="font-semibold text-success">What happens next?</h4>
                                </div>
                                <ul className="text-sm text-base-content/70 space-y-2 list-disc list-inside">
                                    <li>Chat widget appears on your site</li>
                                    <li>Visitors can ask questions</li>
                                    <li>AI provides instant answers</li>
                                    <li>Monitor usage in dashboard</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Help Links */}
                    <div className="text-center pt-4 space-y-2">
                        <div>
                            <a
                                href="https://helpninja.app/help/widget-integration"
                                target="_blank"
                                className="text-sm text-primary hover:underline inline-flex items-center"
                            >
                                <i className="fa-duotone fa-solid fa-book mr-1" aria-hidden />
                                View detailed integration guide
                            </a>
                        </div>
                        <div>
                            <a
                                href="https://helpninja.app/help/widget-customization"
                                target="_blank"
                                className="text-sm text-base-content/70 hover:text-base-content/90 hover:underline inline-flex items-center"
                            >
                                <i className="fa-duotone fa-solid fa-paintbrush mr-1" aria-hidden />
                                Widget customization options
                            </a>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end p-6 border-t border-base-200/60">
                    <HoverScale scale={1.05}>
                        <button onClick={onClose} className="btn btn-primary rounded-xl">
                            <i className="fa-duotone fa-solid fa-check mr-2" aria-hidden />
                            Done
                        </button>
                    </HoverScale>
                </div>
            </div>
        </div>
    );
}

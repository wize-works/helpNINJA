"use client";

import WidgetConfiguration from "@/components/widget-configuration";

interface WidgetConfigModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    siteId: string;
    siteName: string;
    domain: string;
}

export default function WidgetConfigModal({
    isOpen,
    setIsOpen,
    siteId,
    siteName,
    domain
}: WidgetConfigModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto mx-4">
                <div className="sticky top-0 bg-base-100 border-b border-base-200 px-6 py-4 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-base-content">
                            <i className="fa-duotone fa-solid fa-wand-magic-sparkles mr-2" aria-hidden />
                            Configure Widget for {domain}
                        </h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn btn-sm btn-ghost btn-circle rounded-lg"
                        >
                            <i className="fa-duotone fa-solid fa-xmark" aria-hidden />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <WidgetConfiguration
                        siteId={siteId}
                        siteName={siteName}
                        domain={domain}
                        isModal={true}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            </div>
        </div>
    );
}

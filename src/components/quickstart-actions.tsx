"use client";

import { useState } from "react";
import SiteWizardModal from "@/components/site-wizard-modal";
import { HoverScale } from "@/components/ui/animated-page";

export default function QuickStartActions({ needsSites, needsDocs }: { needsSites: boolean; needsDocs: boolean; }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {needsSites ? (
                <HoverScale scale={1.02}>
                    <button className="btn btn-primary rounded-xl" onClick={() => setOpen(true)}>
                        <i className="fa-duotone fa-solid fa-play mr-2" aria-hidden />
                        Start Setup
                    </button>
                </HoverScale>
            ) : needsDocs ? (
                <HoverScale scale={1.02}>
                    <a href="/dashboard/documents" className="btn btn-primary">
                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                        Add Content
                    </a>
                </HoverScale>
            ) : (
                <HoverScale scale={1.02}>
                    <a href="/dashboard/settings" className="btn btn-primary">
                        <i className="fa-duotone fa-solid fa-code mr-2" aria-hidden />
                        Get Widget Code
                    </a>
                </HoverScale>
            )}

            <SiteWizardModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}

"use client";

import { useState } from "react";
import SiteWizardModal from "@/components/site-wizard-modal";
import { HoverScale } from "@/components/ui/animated-page";

export default function SiteWizardButton({ canAdd, remaining }: { canAdd: boolean; remaining: number; }) {
    const [open, setOpen] = useState(false);

    if (!canAdd) {
        return (
            <a href="/dashboard/billing" className="btn btn-outline btn-sm">
                <i className="fa-duotone fa-solid fa-crown mr-2" aria-hidden />
                Upgrade to add more sites
            </a>
        );
    }

    return (
        <>
            <HoverScale scale={1.02}>
                <button className="btn btn-primary rounded-xl" onClick={() => setOpen(true)}>
                    <i className="fa-duotone fa-solid fa-globe mr-2" aria-hidden />
                    Add site ({remaining} left)
                </button>
            </HoverScale>
            <SiteWizardModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}

"use client";

import { useEffect, useState } from "react";
import SiteWizardButton from "@/components/site-wizard-button";

export default function SiteWizardLauncher() {
    const [canAdd, setCanAdd] = useState(false);
    const [remaining, setRemaining] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/site-wizard");
                if (!res.ok) throw new Error("Failed to fetch site wizard data");

                const data = await res.json();
                setCanAdd(data.canAdd);
                setRemaining(data.remaining);
            } catch (error) {
                console.error("Error fetching site wizard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return <div className="btn btn-primary rounded-xl loading">Loading...</div>;
    }

    return <SiteWizardButton canAdd={canAdd} remaining={remaining} />;
}

"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import WidgetConfiguration from "./widget-configuration";

// Define the site interface
interface Site {
    id: string;
    domain: string;
    name: string;
    status: 'active' | 'paused' | 'pending';
    verified: boolean;
    verification_token?: string;
    created_at: string;
    updated_at: string;
}

export default function DefaultWidgetConfiguration() {
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState("");
    const [loading, setLoading] = useState(true);

    // Load sites
    useEffect(() => {
        const loadSites = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/sites");
                if (res.ok) {
                    const data = await res.json();
                    setSites(data);

                    // Select the first verified site by default, if any
                    const verifiedSite = data.find((site: Site) => site.verified);
                    if (verifiedSite) {
                        setSelectedSiteId(verifiedSite.id);
                    } else if (data.length > 0) {
                        setSelectedSiteId(data[0].id);
                    }
                } else {
                    toast.error("Failed to load sites");
                }
            } catch {
                toast.error("Error loading sites");
            } finally {
                setLoading(false);
            }
        };

        loadSites();
    }, []);

    // Handle site change
    const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSiteId(e.target.value);
    };

    // When no sites are available
    if (!loading && sites.length === 0) {
        return (
            <div className="p-8 bg-base-100 rounded-xl shadow-sm border border-base-200/60">
                <div className="text-center">
                    <div className="w-16 h-16 bg-warning/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i className="fa-duotone fa-solid fa-triangle-exclamation text-warning text-xl" aria-hidden />
                    </div>
                    <h3 className="text-xl font-bold text-base-content mb-2">No sites available</h3>
                    <p className="text-base-content/70 mb-6">
                        You need to add and verify at least one site before you can configure the widget.
                    </p>
                    <a href="/dashboard/sites" className="btn btn-primary rounded-xl">
                        <i className="fa-duotone fa-solid fa-globe mr-2" aria-hidden />
                        Manage Sites
                    </a>
                </div>
            </div>
        );
    }

    // Show loading state
    if (loading) {
        return (
            <div className="p-8 bg-base-100 rounded-xl shadow-sm border border-base-200/60">
                <div className="flex items-center justify-center">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                </div>
            </div>
        );
    }

    // Find the selected site
    const selectedSite = sites.find(site => site.id === selectedSiteId);

    return (
        <div className="space-y-6">
            {sites.length > 1 && (
                <div className="flex items-center gap-4 mb-6">
                    <label className="text-base font-medium text-base-content">Choose Site:</label>
                    <select
                        className="select select-bordered rounded-xl"
                        value={selectedSiteId}
                        onChange={handleSiteChange}
                    >
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>
                                {site.name} ({site.domain})
                                {!site.verified && " - Not Verified"}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedSite && (
                <WidgetConfiguration
                    siteId={selectedSite.id}
                    siteName={selectedSite.name}
                    domain={selectedSite.domain}
                />
            )}
        </div>
    );
}

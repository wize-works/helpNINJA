"use client";

import { useState, useEffect } from 'react';
import { HoverScale } from './ui/animated-page';

type SiteStats = {
    id: string;
    name: string;
    domain: string;
    document_count: number;
    chunk_count: number;
    source_count: number;
};

interface SiteDocumentStatsProps {
    selectedSite?: string;
    onSiteSelect?: (siteId: string) => void;
}

export default function SiteDocumentStats({ selectedSite, onSiteSelect }: SiteDocumentStatsProps) {
    const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSiteStats();
    }, []);

    const loadSiteStats = async () => {
        try {
            const response = await fetch('/api/sites/stats');
            if (response.ok) {
                const data = await response.json();
                setSiteStats(data);
            }
        } catch (error) {
            console.error('Error loading site stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="animate-pulse bg-base-300/60 h-24 rounded-xl"></div>
                ))}
            </div>
        );
    }

    if (siteStats.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="w-12 h-12 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="fa-duotone fa-solid fa-globe text-xl text-base-content/40" aria-hidden />
                </div>
                <p className="text-sm text-base-content/60">No sites with content yet</p>
                <a href="/dashboard/sites" className="btn btn-primary btn-sm rounded-lg mt-3">
                    <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                    Add Sites
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base-content">Content by Site</h3>
                <button
                    className={`btn btn-sm rounded-lg ${!selectedSite ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => onSiteSelect?.('')}
                >
                    All Sites
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {siteStats.map((site) => (
                    <HoverScale key={site.id} scale={1.02}>
                        <div
                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${selectedSite === site.id
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'bg-base-100 border-base-300 hover:border-base-400'
                                }`}
                            onClick={() => onSiteSelect?.(site.id)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedSite === site.id ? 'bg-primary/20' : 'bg-base-200'
                                    }`}>
                                    <i className={`fa-duotone fa-solid fa-globe text-sm ${selectedSite === site.id ? 'text-primary' : 'text-base-content/60'
                                        }`} aria-hidden />
                                </div>
                                {selectedSite === site.id && (
                                    <i className="fa-duotone fa-solid fa-check text-primary" aria-hidden />
                                )}
                            </div>

                            <div className="mb-2">
                                <div className="font-semibold text-sm text-base-content truncate" title={site.name}>
                                    {site.name}
                                </div>
                                <div className="text-xs text-base-content/60 truncate" title={site.domain}>
                                    {site.domain}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                    <div className="font-semibold">{site.source_count}</div>
                                    <div className="text-base-content/60">Sources</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold">{site.document_count}</div>
                                    <div className="text-base-content/60">Docs</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-semibold">{site.chunk_count}</div>
                                    <div className="text-base-content/60">Chunks</div>
                                </div>
                            </div>
                        </div>
                    </HoverScale>
                ))}
            </div>
        </div>
    );
}

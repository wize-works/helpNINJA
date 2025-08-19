"use client";

import { useState } from "react";
import SiteSelector from "./site-selector";

interface DocumentsFiltersProps {
    onFiltersChange?: (filters: {
        searchQuery: string;
        selectedSite: string;
        sourceType: string;
        sortBy: string;
    }) => void;
    initialFilters?: {
        searchQuery: string;
        selectedSite: string;
        sourceType: string;
        sortBy: string;
    };
}

export default function DocumentsFilters({ onFiltersChange, initialFilters }: DocumentsFiltersProps) {
    const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || "");
    const [selectedSite, setSelectedSite] = useState(initialFilters?.selectedSite || "");
    const [sourceType, setSourceType] = useState(initialFilters?.sourceType || "");
    const [sortBy, setSortBy] = useState(initialFilters?.sortBy || "created_desc");

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = {
            searchQuery: key === 'searchQuery' ? value : searchQuery,
            selectedSite: key === 'selectedSite' ? value : selectedSite,
            sourceType: key === 'sourceType' ? value : sourceType,
            sortBy: key === 'sortBy' ? value : sortBy,
        };

        // Update local state
        switch (key) {
            case 'searchQuery':
                setSearchQuery(value);
                break;
            case 'selectedSite':
                setSelectedSite(value);
                break;
            case 'sourceType':
                setSourceType(value);
                break;
            case 'sortBy':
                setSortBy(value);
                break;
        }

        // Notify parent component
        onFiltersChange?.(newFilters);
    };

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="fa-duotone fa-solid fa-search text-base-content/40 text-sm" aria-hidden />
                            </div>
                            <input
                                type="text"
                                className="input input-bordered w-full pl-10"
                                placeholder="Search documents by title, URL, or content..."
                                value={searchQuery}
                                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">Site</span>
                            </label>
                            <SiteSelector
                                value={selectedSite}
                                onChange={(value) => handleFilterChange('selectedSite', value || "")}
                                placeholder="All sites"
                                className="select-sm w-40"
                            />
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">Source Type</span>
                            </label>
                            <select
                                className="select select-bordered select-sm w-36"
                                value={sourceType}
                                onChange={(e) => handleFilterChange('sourceType', e.target.value)}
                            >
                                <option value="">All sources</option>
                                <option value="crawl">Web crawl</option>
                                <option value="sitemap">Sitemap</option>
                                <option value="manual">Manual</option>
                                <option value="upload">Upload</option>
                            </select>
                        </div>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">Sort by</span>
                            </label>
                            <select
                                className="select select-bordered select-sm w-32"
                                value={sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                            >
                                <option value="created_desc">Newest</option>
                                <option value="created_asc">Oldest</option>
                                <option value="title_asc">Title A-Z</option>
                                <option value="title_desc">Title Z-A</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";

type Site = {
    id: string;
    domain: string;
    name: string;
    status: 'active' | 'paused' | 'pending';
    verified: boolean;
};

type SiteSelectorProps = {
    value?: string;
    onChange: (siteId: string | null) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    showOnlyVerified?: boolean;
    showStatus?: boolean;
    allowNone?: boolean;
    noneLabel?: string;
    className?: string;
};

export default function SiteSelector({
    value,
    onChange,
    placeholder = "Select a site...",
    required = false,
    disabled = false,
    showOnlyVerified = false,
    showStatus = true,
    allowNone = true,
    noneLabel = "All sites",
    className = ""
}: SiteSelectorProps) {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSites();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadSites() {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/sites');

            if (!res.ok) {
                throw new Error('Failed to load sites');
            }

            const data = await res.json();

            // Filter sites based on showOnlyVerified
            const filteredSites = showOnlyVerified
                ? data.filter((site: Site) => site.verified)
                : data;

            setSites(filteredSites);
        } catch (err) {
            console.error('Error loading sites:', err);
            setError('Failed to load sites');
        } finally {
            setLoading(false);
        }
    }

    function handleSelectionChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const selectedValue = e.target.value;
        onChange(selectedValue === '' ? null : selectedValue);
    }

    // Note: selected site object not needed here; parent controls selected value

    if (loading) {
        return (
            <div className={`select select-bordered ${className}`}>
                <option disabled>Loading sites...</option>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`select select-bordered select-error ${className}`}>
                <option disabled>Error loading sites</option>
            </div>
        );
    }

    if (sites.length === 0) {
        return (
            <div className="form-control">
                <select className={`select select-bordered select-disabled ${className}`} disabled>
                    <option>No sites available</option>
                </select>
                <label className="label">
                    <span className="label-text-alt text-warning">
                        <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" aria-hidden />
                        No {showOnlyVerified ? 'verified ' : ''}sites found. Please add a site first.
                    </span>
                </label>
            </div>
        );
    }

    return (
        <select
            value={value || ''}
            onChange={handleSelectionChange}
            className={`select select-bordered ${className}`}
            required={required}
            disabled={disabled}
        >
            {/* None/All option */}
            {allowNone && (
                <option value="">
                    {noneLabel}
                </option>
            )}

            {/* Placeholder option for required selects */}
            {required && !allowNone && !value && (
                <option value="" disabled>
                    {placeholder}
                </option>
            )}

            {/* Site options */}
            {sites.map((site) => (
                <option key={site.id} value={site.id}>
                    {site.name} ({site.domain})
                    {showStatus && (
                        <>
                            {!site.verified ? ' - Unverified' : ''}
                            {site.status !== 'active' ? ` - ${site.status}` : ''}
                        </>
                    )}
                </option>
            ))}
        </select>
    );
}

// Wrapper component with label for forms
type SiteSelectorFieldProps = SiteSelectorProps & {
    label: string;
    help?: string;
    error?: string;
};

export function SiteSelectorField({
    label,
    help,
    error,
    className,
    ...props
}: SiteSelectorFieldProps) {
    return (
        <div className="form-control">
            <label className="label">
                <span className="label-text">
                    {label}
                    {props.required && <span className="text-error ml-1">*</span>}
                </span>
            </label>

            <SiteSelector {...props} className={`${error ? 'select-error' : ''} ${className || ''}`} />

            {(help || error) && (
                <label className="label">
                    <span className={`label-text-alt ${error ? 'text-error' : ''}`}>
                        {error && <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" aria-hidden />}
                        {error || help}
                    </span>
                </label>
            )}
        </div>
    );
}

// Hook for easier usage in forms
export function useSiteSelector(initialValue?: string) {
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(initialValue || null);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSites() {
            try {
                const res = await fetch('/api/sites');

                if (res.ok) {
                    const data = await res.json();
                    setSites(data);
                }
            } catch (error) {
                console.error('Error loading sites:', error);
            } finally {
                setLoading(false);
            }
        }

        loadSites();
    }, []);

    const selectedSite = sites.find(site => site.id === selectedSiteId);

    return {
        selectedSiteId,
        setSelectedSiteId,
        selectedSite,
        sites,
        loading
    };
}

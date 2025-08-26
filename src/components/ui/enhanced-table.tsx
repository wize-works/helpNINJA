"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

export interface TableColumn<T> {
    key: keyof T;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
    className?: string;
}

export interface EnhancedTableProps<T> {
    data: T[];
    columns: TableColumn<T>[];
    searchPlaceholder?: string;
    itemsPerPage?: number;
    className?: string;
    emptyState?: React.ReactNode;
    caption?: string; // For accessibility
}

type SortConfig<T> = {
    key: keyof T;
    direction: 'asc' | 'desc';
} | null;

export function EnhancedTable<T extends Record<string, unknown>>({
    data,
    columns,
    searchPlaceholder = "Search...",
    itemsPerPage = 10,
    className = "",
    emptyState,
    caption
}: EnhancedTableProps<T>) {
    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const searchRef = useRef<HTMLInputElement>(null);

    // Filter data based on search and column filters
    const filteredData = useMemo(() => {
        let result = data;

        // Apply search filter
        if (search) {
            result = result.filter(item =>
                Object.values(item).some(value =>
                    String(value).toLowerCase().includes(search.toLowerCase())
                )
            );
        }

        // Apply column filters
        Object.entries(filters).forEach(([column, filterValue]) => {
            if (filterValue) {
                result = result.filter(item =>
                    String(item[column]).toLowerCase().includes(filterValue.toLowerCase())
                );
            }
        });

        return result;
    }, [data, search, filters]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortConfig) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [filteredData, sortConfig]);

    // Paginate data
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const handleSort = useCallback((key: keyof T) => {
        setSortConfig(current => {
            if (current?.key === key) {
                if (current.direction === 'asc') {
                    return { key, direction: 'desc' };
                } else {
                    return null; // Remove sort
                }
            }
            return { key, direction: 'asc' };
        });
    }, []);

    const handleFilterChange = useCallback((column: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [column]: value
        }));
        setCurrentPage(1); // Reset to first page when filtering
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent, action: () => void) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            action();
        }
    }, []);

    const getSortIcon = (column: TableColumn<T>) => {
        if (!column.sortable) return null;

        const isActive = sortConfig?.key === column.key;
        if (!isActive) {
            return (
                <i className="fa-duotone fa-solid fa-sort text-xs opacity-30" aria-hidden />
            );
        }

        return sortConfig?.direction === 'asc' ? (
            <i className="fa-duotone fa-solid fa-sort-up text-xs" aria-hidden />
        ) : (
            <i className="fa-duotone fa-solid fa-sort-down text-xs" aria-hidden />
        );
    };

    const getSortAriaLabel = (column: TableColumn<T>) => {
        if (!column.sortable) return undefined;

        const isActive = sortConfig?.key === column.key;
        if (!isActive) {
            return `Sort by ${column.header}`;
        }

        const direction = sortConfig?.direction === 'asc' ? 'ascending' : 'descending';
        return `Currently sorted by ${column.header} in ${direction} order. Click to ${sortConfig?.direction === 'asc' ? 'sort descending' : 'remove sort'
            }`;
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd + K to focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    if (filteredData.length === 0 && emptyState) {
        return <div role="status" aria-live="polite">{emptyState}</div>;
    }

    return (
        <div className={`space-y-4 ${className}`} role="region" aria-label="Data table with search and filters">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label htmlFor="table-search" className="sr-only">
                        {searchPlaceholder}
                    </label>
                    <input
                        id="table-search"
                        ref={searchRef}
                        type="search"
                        placeholder={`${searchPlaceholder} (Ctrl+K)`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input input-bordered input-sm w-full"
                        aria-describedby="search-help"
                    />
                    <div id="search-help" className="sr-only">
                        Use Ctrl+K to quickly focus this search field
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap" role="group" aria-label="Column filters">
                    {columns.filter(col => col.filterable).map(column => (
                        <div key={String(column.key)}>
                            <label htmlFor={`filter-${String(column.key)}`} className="sr-only">
                                Filter by {column.header}
                            </label>
                            <select
                                id={`filter-${String(column.key)}`}
                                value={filters[String(column.key)] || ""}
                                onChange={(e) => handleFilterChange(String(column.key), e.target.value)}
                                className="select select-bordered select-sm"
                                aria-label={`Filter by ${column.header}`}
                            >
                                <option value="">All {column.header}</option>
                                {/* Generate options from unique values */}
                                {Array.from(new Set(data.map(item => String(item[column.key]))))
                                    .filter(Boolean)
                                    .sort()
                                    .map(value => (
                                        <option key={value} value={value}>{value}</option>
                                    ))
                                }
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Results summary */}
            <div className="text-sm text-base-content/70" aria-live="polite">
                {search || Object.values(filters).some(Boolean) ? (
                    <>Showing {sortedData.length} of {data.length} results</>
                ) : (
                    <>Showing {sortedData.length} results</>
                )}
            </div>

            {/* Table */}
            <div className="card bg-base-100 shadow-xl rounded-2xl">
                <div className="overflow-x-auto">
                    <table
                        className="table table-hover w-full"
                        role="table"
                        aria-label={caption || "Data table"}
                    >
                        {caption && <caption className="sr-only">{caption}</caption>}
                        <thead>
                            <tr role="row">
                                {columns.map(column => (
                                    <th
                                        key={String(column.key)}
                                        className={`${column.className || ''} ${column.sortable ? 'cursor-pointer select-none hover:bg-base-200' : ''}`}
                                        onClick={() => column.sortable && handleSort(column.key)}
                                        onKeyDown={(e) => column.sortable && handleKeyDown(e, () => handleSort(column.key))}
                                        tabIndex={column.sortable ? 0 : undefined}
                                        role="columnheader"
                                        aria-sort={
                                            sortConfig?.key === column.key
                                                ? sortConfig.direction === 'asc' ? 'ascending' : 'descending'
                                                : column.sortable ? 'none' : undefined
                                        }
                                        aria-label={getSortAriaLabel(column)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{column.header}</span>
                                            {getSortIcon(column)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((row, index) => (
                                <tr key={index} className="hover:bg-base-200/50" role="row">
                                    {columns.map(column => (
                                        <td key={String(column.key)} className={column.className || ''} role="cell">
                                            {column.render
                                                ? column.render(row[column.key], row)
                                                : String(row[column.key] || '')
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <nav role="navigation" aria-label="Table pagination">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/70" aria-live="polite">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} results
                        </div>
                        <div className="join" role="group" aria-label="Pagination controls">
                            <button
                                className="join-item btn btn-sm rounded-lg"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                aria-label="Go to previous page"
                            >
                                <i className="fa-duotone fa-solid fa-chevron-left" aria-hidden />
                                Previous
                            </button>

                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                if (totalPages <= 5) {
                                    pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNumber = totalPages - 4 + i;
                                } else {
                                    pageNumber = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNumber}
                                        className={`join-item btn btn-sm rounded-lg ${currentPage === pageNumber ? 'btn-active' : ''}`}
                                        onClick={() => setCurrentPage(pageNumber)}
                                        aria-label={`Go to page ${pageNumber}`}
                                        aria-current={currentPage === pageNumber ? 'page' : undefined}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}

                            <button
                                className="join-item btn btn-sm rounded-lg"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                aria-label="Go to next page"
                            >
                                Next
                                <i className="fa-duotone fa-solid fa-chevron-right" aria-hidden />
                            </button>
                        </div>
                    </div>
                </nav>
            )}
        </div>
    );
} 
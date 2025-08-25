"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DocumentsFilters from "@/components/documents-filters";
import SelectableDocumentsTable from "@/components/selectable-documents-table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { StaggerContainer, StaggerChild } from "@/components/ui/animated-page";

type DocRow = {
    id: string;
    url: string;
    title: string;
    created_at: string;
    site_id?: string;
    site_name?: string;
    site_domain?: string;
    source_kind?: string;
    source_title?: string;
    chunk_count: number;
    total_tokens: number;
    content_length: number;
}

interface DocumentsContentWrapperProps {
    initialDocs: DocRow[];
    tenantId: string;
}

export default function DocumentsContentWrapper({ initialDocs, tenantId }: DocumentsContentWrapperProps) {
    const [docs, setDocs] = useState<DocRow[]>(initialDocs);
    const [isLoading, startTransition] = useTransition();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize from URL params if they exist
    const initialSearchQuery = searchParams.get('q') || "";
    const initialSite = searchParams.get('site') || "";
    const initialSourceType = searchParams.get('source') || "";
    const initialSortBy = searchParams.get('sort') || "created_desc";

    const fetchDocuments = async (filters: {
        searchQuery: string;
        selectedSite: string;
        sourceType: string;
        sortBy: string;
    }) => {
        try {
            const searchParams = new URLSearchParams();
            searchParams.set('tenantId', tenantId);
            if (filters.searchQuery) searchParams.set('q', filters.searchQuery);
            if (filters.selectedSite) searchParams.set('site', filters.selectedSite);
            if (filters.sourceType) searchParams.set('source', filters.sourceType);
            if (filters.sortBy) searchParams.set('sort', filters.sortBy);

            const response = await fetch(`/api/documents/search?${searchParams.toString()}`);

            if (response.ok) {
                const data = await response.json();
                setDocs(data.docs);
                return data.docs;
            } else {
                console.error('Error fetching filtered documents');
                return [];
            }
        } catch (error) {
            console.error('Error fetching filtered documents:', error);
            return [];
        }
    };

    const handleFiltersChange = async (filters: {
        searchQuery: string;
        selectedSite: string;
        sourceType: string;
        sortBy: string;
    }) => {
        startTransition(async () => {
            // Update URL with search params
            const params = new URLSearchParams();
            if (filters.searchQuery) params.set('q', filters.searchQuery);
            if (filters.selectedSite) params.set('site', filters.selectedSite);
            if (filters.sourceType) params.set('source', filters.sourceType);
            if (filters.sortBy !== 'created_desc') params.set('sort', filters.sortBy);

            // Update the URL without a full page reload
            const queryString = params.toString();
            router.push(`/dashboard/documents${queryString ? `?${queryString}` : ''}`, { scroll: false });

            await fetchDocuments(filters);
        });
    };

    const handleRefresh = async () => {
        startTransition(async () => {
            await fetchDocuments({
                searchQuery: initialSearchQuery,
                selectedSite: initialSite,
                sourceType: initialSourceType,
                sortBy: initialSortBy
            });
        });
    }; return (
        <>
            {/* Filters & Search */}
            <StaggerContainer>
                <StaggerChild>
                    <DocumentsFilters
                        onFiltersChange={handleFiltersChange}
                        initialFilters={{
                            searchQuery: initialSearchQuery,
                            selectedSite: initialSite,
                            sourceType: initialSourceType,
                            sortBy: initialSortBy
                        }}
                    />
                </StaggerChild>
            </StaggerContainer>

            {/* Content */}
            <StaggerContainer>
                <StaggerChild>
                    {isLoading ? (
                        <div className="space-y-4">
                            <TableSkeleton rows={5} columns={5} />
                        </div>
                    ) : (
                        <SelectableDocumentsTable docs={docs} onRefresh={handleRefresh} />
                    )}
                </StaggerChild>
            </StaggerContainer>
        </>
    );
}

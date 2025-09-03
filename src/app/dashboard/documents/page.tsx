import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import IngestForm from "@/components/ingest-form";
import SelectableDocumentsTable from "@/components/selectable-documents-table";

import { TableSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { Suspense } from "react";
import FilterControls from "./filter-controls";
import StatCard from "@/components/ui/stat-card";

export const runtime = 'nodejs'

interface Filters {
    q?: string;
    site?: string;
    source?: string;
    sort?: string;
}

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

function buildConditions(tenantId: string, filters: Filters) {
    const conditions: string[] = ['d.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.site) {
        conditions.push(`d.site_id = $${idx}`);
        params.push(filters.site);
        idx++;
    }

    if (filters.source) {
        conditions.push(`s.kind = $${idx}`);
        params.push(filters.source);
        idx++;
    }

    if (filters.q) {
        conditions.push(`(
            d.title ILIKE $${idx} OR 
            d.url ILIKE $${idx} OR 
            d.content ILIKE $${idx}
        )`);
        params.push(`%${filters.q}%`);
        idx++;
    }

    return { where: conditions.join(' AND '), params };
}

function buildOrderBy(sort?: string): string {
    if (!sort || sort === 'created_desc') return 'd.created_at DESC';

    const sortMap: Record<string, string> = {
        'created_asc': 'd.created_at ASC',
        'title_asc': 'd.title ASC',
        'title_desc': 'd.title DESC',
        'chunks_desc': 'COALESCE(c.chunk_count, 0) DESC',
        'chunks_asc': 'COALESCE(c.chunk_count, 0) ASC',
        'tokens_desc': 'COALESCE(c.total_tokens, 0) DESC',
        'tokens_asc': 'COALESCE(c.total_tokens, 0) ASC'
    };

    return sortMap[sort] || 'd.created_at DESC';
}

async function getDocs(tenantId: string, filters: Filters = {}) {
    const { where, params } = buildConditions(tenantId, filters);
    const orderBy = buildOrderBy(filters.sort);

    const queryText = `
        SELECT d.id, d.url, d.title, d.created_at, d.site_id,
               ts.name as site_name, ts.domain as site_domain,
               s.kind as source_kind, s.title as source_title,
               COALESCE(c.chunk_count, 0)::int as chunk_count,
               COALESCE(c.total_tokens, 0)::int as total_tokens,
               char_length(d.content)::int as content_length
        FROM public.documents d
        LEFT JOIN public.tenant_sites ts ON ts.id = d.site_id
        LEFT JOIN public.sources s ON s.id = d.source_id
        LEFT JOIN (
            SELECT document_id, COUNT(*) as chunk_count, SUM(token_count) as total_tokens
            FROM public.chunks
            GROUP BY document_id
        ) c ON c.document_id = d.id
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT 100
    `;

    const { rows } = await query<DocRow>(queryText, params);
    return rows;
}

async function listSites(tenantId: string) {
    try {
        const { rows } = await query<{ id: string; domain: string; name: string }>(
            `SELECT id, domain, name 
             FROM public.tenant_sites 
             WHERE tenant_id=$1 
             ORDER BY name ASC`,
            [tenantId]
        );
        return rows;
    } catch (error) {
        console.error('Error fetching sites:', error);
        return [];
    }
}

export default async function DocumentsPage({
    searchParams
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const resolved = await searchParams;
    const filters: Filters = {
        q: typeof resolved.q === 'string' ? resolved.q : undefined,
        site: typeof resolved.site === 'string' ? resolved.site : undefined,
        source: typeof resolved.source === 'string' ? resolved.source : undefined,
        sort: typeof resolved.sort === 'string' ? resolved.sort : undefined
    };

    const tenantId = await getTenantIdStrict();
    const sites = await listSites(tenantId);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Documents", icon: "fa-file-lines" }
    ];

    return (
        <AnimatedPage>
            <div className="space-y-8">
                {/* Breadcrumb */}
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col gap-6">
                            {/* Title and Description */}
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-base-content">Knowledge Base</h1>
                                    <p className="text-base-content/60 mt-2">
                                        Manage your AI training content from websites, documents, and manual sources
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <FilterControls filters={filters} sites={sites} />
                                        <HoverScale scale={1.02}>
                                            <a href="/dashboard/sources" className="btn btn-outline btn-sm rounded-lg">
                                                <i className="fa-duotone fa-solid fa-database mr-2" aria-hidden />
                                                Manage Sources
                                            </a>
                                        </HoverScale>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                <StaggerContainer>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <StaggerChild>
                            <StatCard
                                title="Total Documents"
                                value="500"
                                icon="fa-file-lines"
                                color="primary"
                                description="in your knowledge base"
                            />
                        </StaggerChild>
                        <StaggerChild>
                            <StatCard
                                title="Total Chunks"
                                value="12,345"
                                icon="fa-puzzle-piece"
                                color="secondary"
                                description="across all documents"
                            />
                        </StaggerChild>
                        <StaggerChild>
                            <StatCard
                                title="Total Tokens"
                                value="1.2M"
                                icon="fa-coins"
                                color="success"
                                description="in your knowledge base"
                            />
                        </StaggerChild>
                        <StaggerChild>
                            <StatCard
                                title="Average Chunks/Document"
                                value="24.7"
                                icon="fa-chart-simple"
                                color="info"
                                description="based on current documents"
                            />
                        </StaggerChild>
                    </div>
                </StaggerContainer>
                <IngestForm />

                {/* Content */}
                <Suspense fallback={
                    <div className="space-y-4">
                        <TableSkeleton rows={5} columns={5} />
                    </div>
                }>
                    <DocumentsContent tenantId={tenantId} filters={filters} />
                </Suspense>
            </div>
        </AnimatedPage>
    )
}

async function DocumentsContent({ tenantId, filters }: { tenantId: string; filters: Filters }) {
    const docs = await getDocs(tenantId, filters);

    return (
        <div className="space-y-6">
            <SelectableDocumentsTable docs={docs} />
        </div>
    );
}

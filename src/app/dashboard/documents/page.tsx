import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import IngestForm from "@/components/ingest-form";
import DocumentsContentWrapper from "@/components/documents-content-wrapper";

import { TableSkeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { Suspense } from "react";

export const runtime = 'nodejs'

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

async function getDocs(tenantId: string, siteId?: string) {
    let queryText = `
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
        WHERE d.tenant_id = $1
    `;

    const params: unknown[] = [tenantId];

    if (siteId) {
        queryText += ' AND d.site_id = $2';
        params.push(siteId);
    }

    queryText += ' ORDER BY d.created_at DESC LIMIT 100';

    const { rows } = await query<DocRow>(queryText, params);
    return rows;
}

async function DocumentsStats({ tenantId }: { tenantId: string }) {
    try {
        const statsQuery = await query<{
            total_docs: number;
            sites_count: number;
            avg_docs_per_site: number;
            last_added: string;
        }>(
            `SELECT 
                COUNT(d.id)::int as total_docs,
                COUNT(DISTINCT d.site_id)::int as sites_count,
                CASE 
                    WHEN COUNT(DISTINCT d.site_id) > 0 
                    THEN ROUND(COUNT(d.id)::numeric / COUNT(DISTINCT d.site_id), 1)::numeric
                    ELSE 0 
                END as avg_docs_per_site,
                MAX(d.created_at) as last_added
            FROM public.documents d 
            WHERE d.tenant_id = $1`,
            [tenantId]
        );

        const stats = statsQuery.rows[0];

        return (
            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-figure text-info">
                        <i className="fa-duotone fa-solid fa-book-open text-2xl" aria-hidden />
                    </div>
                    <div className="stat-title">Knowledge Base</div>
                    <div className="stat-value text-info text-lg">{stats.total_docs}</div>
                    <div className="stat-desc">Across {stats.sites_count} sites</div>
                </div>
            </div>
        );
    } catch {
        return (
            <div className="stats shadow">
                <div className="stat">
                    <div className="stat-figure text-info">
                        <i className="fa-duotone fa-solid fa-book-open text-2xl" aria-hidden />
                    </div>
                    <div className="stat-title">Knowledge Base</div>
                    <div className="stat-value text-info text-lg">0</div>
                    <div className="stat-desc">No documents yet</div>
                </div>
            </div>
        );
    }
}

export default async function DocumentsPage() {
    const tenantId = await getTenantIdStrict()

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
                                    <DocumentsStats tenantId={tenantId} />
                                    <HoverScale scale={1.02}>
                                        <a href="/dashboard/sources" className="btn btn-outline btn-sm rounded-lg">
                                            <i className="fa-duotone fa-solid fa-database mr-2" aria-hidden />
                                            Manage Sources
                                        </a>
                                    </HoverScale>
                                </div>
                            </div>
                            <IngestForm />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content with filters */}
                <Suspense fallback={
                    <div className="space-y-4">
                        <TableSkeleton rows={5} columns={5} />
                    </div>
                }>
                    <DocumentsContent tenantId={tenantId} />
                </Suspense>
            </div>
        </AnimatedPage>
    )
}

async function DocumentsContent({ tenantId }: { tenantId: string }) {
    const docs = await getDocs(tenantId);
    return <DocumentsContentWrapper initialDocs={docs} tenantId={tenantId} />;
}

import { getTenantIdStrict } from "@/lib/tenant-resolve";
import { query } from "@/lib/db";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild } from "@/components/ui/animated-page";
import { Suspense } from "react";
import FilterControls from "./filter-controls";
import AnswersClient from "./client";

export const runtime = 'nodejs'

interface Filters {
    search?: string;
    siteId?: string;
    status?: string;
}

type Answer = {
    id: string;
    question: string;
    answer: string;
    keywords: string[];
    tags: string[];
    priority: number;
    status: 'active' | 'draft' | 'disabled';
    site_id?: string;
    site_name?: string;
    site_domain?: string;
    created_at: string;
    updated_at: string;
};

function buildConditions(tenantId: string, filters: Filters) {
    const conditions: string[] = ['a.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let idx = 2;

    if (filters.siteId) {
        conditions.push(`a.site_id = $${idx}`);
        params.push(filters.siteId);
        idx++;
    }

    if (filters.status && filters.status !== 'all') {
        conditions.push(`a.status = $${idx}`);
        params.push(filters.status);
        idx++;
    }

    if (filters.search) {
        conditions.push(`(
            a.question_tsv @@ plainto_tsquery('english', $${idx}) OR
            a.question ILIKE $${idx + 1} OR
            a.answer ILIKE $${idx + 1} OR
            $${idx} = ANY(a.keywords) OR
            $${idx} = ANY(a.tags)
        )`);
        params.push(filters.search, `%${filters.search}%`);
        idx += 2;
    }

    return { where: conditions.join(' AND '), params };
}

async function getAnswers(tenantId: string, filters: Filters = {}) {
    const { where, params } = buildConditions(tenantId, filters);

    const queryText = `
        SELECT a.*, 
               ts.name as site_name,
               ts.domain as site_domain
        FROM public.answers a
        LEFT JOIN public.tenant_sites ts ON ts.id = a.site_id
        WHERE ${where}
        ORDER BY a.priority DESC, a.updated_at DESC
    `;

    const { rows } = await query<Answer>(queryText, params);
    return rows;
}

async function getAnswersStats(tenantId: string) {
    try {
        const statsQuery = await query<{
            total: number;
            active: number;
            draft: number;
            disabled: number;
        }>(
            `SELECT 
                COUNT(id)::int as total,
                COUNT(id) FILTER (WHERE status = 'active')::int as active,
                COUNT(id) FILTER (WHERE status = 'draft')::int as draft,
                COUNT(id) FILTER (WHERE status = 'disabled')::int as disabled
            FROM public.answers 
            WHERE tenant_id = $1`,
            [tenantId]
        );

        return statsQuery.rows[0];
    } catch {
        return { total: 0, active: 0, draft: 0, disabled: 0 };
    }
}

export default async function AnswersPage({
    searchParams
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const resolved = await searchParams;
    const filters: Filters = {
        search: typeof resolved.search === 'string' ? resolved.search : undefined,
        siteId: typeof resolved.siteId === 'string' ? resolved.siteId : undefined,
        status: typeof resolved.status === 'string' ? resolved.status : 'active'
    };

    const tenantId = await getTenantIdStrict();
    const answers = await getAnswers(tenantId, filters);
    const stats = await getAnswersStats(tenantId);

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Sites", href: "/dashboard/sites", icon: "fa-globe" },
        { label: "Answers", icon: "fa-comment-question" }
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
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Curated Answers</h1>
                                <p className="text-base-content/60 mt-2">
                                    Create high-priority, manually crafted responses that take precedence over AI-generated answers
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-figure text-primary">
                                            <i className="fa-duotone fa-solid fa-comment-question text-2xl" aria-hidden />
                                        </div>
                                        <div className="stat-value text-primary text-lg">{stats.total}</div>
                                        <div className="stat-desc">Active: {stats.active}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FilterControls filters={filters} />
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Content */}
                <Suspense fallback={
                    <div className="p-8 space-y-4">
                        {Array.from({ length: 3 }, (_, i) => (
                            <div key={i} className="animate-pulse bg-base-300/60 h-20 rounded-xl"></div>
                        ))}
                    </div>
                }>
                    <AnswersClient answers={answers} filters={filters} />
                </Suspense>

                {/* Help Section */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-2xl">
                            <div className="card-body">
                                <h2 className="card-title">
                                    <i className="fa-duotone fa-solid fa-lightbulb mr-2 text-primary" aria-hidden />
                                    How Curated Answers Work
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-arrow-up text-primary" aria-hidden />
                                            <h3 className="font-semibold">Higher Priority</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Curated answers are shown before AI-generated responses, giving you control over important messaging.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-bullseye text-primary" aria-hidden />
                                            <h3 className="font-semibold">Smart Matching</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Keywords and tags help the AI understand when to use your curated answers for relevant questions.
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <i className="fa-duotone fa-solid fa-globe text-primary" aria-hidden />
                                            <h3 className="font-semibold">Site-Specific</h3>
                                        </div>
                                        <p className="text-sm text-base-content/70">
                                            Associate answers with specific sites to provide targeted responses for different audiences.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

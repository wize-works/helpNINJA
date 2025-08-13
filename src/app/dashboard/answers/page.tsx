"use client";

import { useState, useEffect } from 'react';
import { getTenantIdServer } from "@/lib/auth";
import AnswerEditor from "@/components/answer-editor";
import SiteSelector from "@/components/site-selector";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";
import { useTenant } from "@/components/tenant-context";

type Answer = {
    id?: string;
    question: string;
    answer: string;
    keywords: string[];
    tags: string[];
    priority: number;
    status: 'active' | 'draft' | 'disabled';
    site_id?: string;
    site_name?: string;
    site_domain?: string;
    created_at?: string;
    updated_at?: string;
};

export default function AnswersPage() {
    const { tenantId } = useTenant();
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingAnswer, setEditingAnswer] = useState<Answer | undefined>();
    const [filters, setFilters] = useState({
        siteId: '',
        status: 'active',
        search: ''
    });

    const breadcrumbItems = [
        { label: "Dashboard", href: "/dashboard", icon: "fa-gauge-high" },
        { label: "Sites", href: "/dashboard/sites", icon: "fa-globe" },
        { label: "Answers", icon: "fa-comment-question" }
    ];

    useEffect(() => {
        if (tenantId) {
            loadAnswers();
        }
    }, [tenantId, filters]);

    const loadAnswers = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.siteId) params.set('siteId', filters.siteId);
            if (filters.status && filters.status !== 'all') params.set('status', filters.status);
            if (filters.search) params.set('search', filters.search);

            const response = await fetch(`/api/answers?${params}`, {
                headers: { 'x-tenant-id': tenantId }
            });
            if (response.ok) {
                const data = await response.json();
                setAnswers(data);
            }
        } catch (error) {
            console.error('Error loading answers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (answer: Answer) => {
        setShowEditor(false);
        setEditingAnswer(undefined);
        loadAnswers();
    };

    const handleDelete = (answerId: string) => {
        setShowEditor(false);
        setEditingAnswer(undefined);
        loadAnswers();
    };

    const handleEdit = (answer: Answer) => {
        setEditingAnswer(answer);
        setShowEditor(true);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return 'fa-check-circle text-success';
            case 'draft': return 'fa-edit text-warning';
            case 'disabled': return 'fa-pause-circle text-error';
            default: return 'fa-question-circle text-base-content/60';
        }
    };

    const getPriorityColor = (priority: number) => {
        if (priority >= 80) return 'text-error';
        if (priority >= 40) return 'text-warning';
        return 'text-base-content/60';
    };

    if (!tenantId) {
        return <div className="text-center py-8">Loading...</div>;
    }

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
                                        <div className="stat-title">Total Answers</div>
                                        <div className="stat-value text-primary text-lg">{answers.length}</div>
                                        <div className="stat-desc">Active: {answers.filter(a => a.status === 'active').length}</div>
                                    </div>
                                </div>
                                <HoverScale scale={1.02}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setEditingAnswer(undefined);
                                            setShowEditor(true);
                                        }}
                                    >
                                        <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                        Create Answer
                                    </button>
                                </HoverScale>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Editor */}
                {showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <AnswerEditor
                                tenantId={tenantId}
                                answer={editingAnswer}
                                onSave={handleSave}
                                onCancel={() => {
                                    setShowEditor(false);
                                    setEditingAnswer(undefined);
                                }}
                                onDelete={handleDelete}
                            />
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Filters */}
                {!showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Filter by site</span>
                                            </label>
                                            <SiteSelector
                                                tenantId={tenantId}
                                                value={filters.siteId}
                                                onChange={(siteId) => setFilters(prev => ({ ...prev, siteId: siteId || '' }))}
                                                allowNone={true}
                                                noneLabel="All sites"
                                                placeholder="Select a site"
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Status</span>
                                            </label>
                                            <select
                                                className="select select-bordered"
                                                value={filters.status}
                                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                            >
                                                <option value="all">All statuses</option>
                                                <option value="active">Active</option>
                                                <option value="draft">Draft</option>
                                                <option value="disabled">Disabled</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 form-control">
                                            <label className="label">
                                                <span className="label-text">Search</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered"
                                                placeholder="Search questions, answers, keywords, or tags..."
                                                value={filters.search}
                                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Answers List */}
                {!showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 border border-base-300">
                                <div className="card-body p-0">
                                    {loading ? (
                                        <div className="p-8 space-y-4">
                                            {Array.from({ length: 3 }, (_, i) => (
                                                <div key={i} className="animate-pulse bg-base-300/60 h-20 rounded-xl"></div>
                                            ))}
                                        </div>
                                    ) : answers.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                                <i className="fa-duotone fa-solid fa-comment-question text-2xl text-base-content/40" aria-hidden />
                                            </div>
                                            <h3 className="font-semibold text-lg mb-2">No answers found</h3>
                                            <p className="text-base-content/60 mb-4">
                                                {filters.search || filters.siteId || filters.status !== 'active'
                                                    ? 'Try adjusting your filters'
                                                    : 'Create your first curated answer to provide consistent, high-quality responses'
                                                }
                                            </p>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => {
                                                    setEditingAnswer(undefined);
                                                    setShowEditor(true);
                                                }}
                                            >
                                                <i className="fa-duotone fa-solid fa-plus mr-2" aria-hidden />
                                                Create Answer
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-base-200">
                                            {answers.map((answer) => (
                                                <div key={answer.id} className="p-6 hover:bg-base-200/40 transition-colors">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <i className={`fa-duotone fa-solid ${getStatusIcon(answer.status)}`} aria-hidden />
                                                                <h3 className="font-semibold text-base-content line-clamp-2">
                                                                    {answer.question}
                                                                </h3>
                                                                <div className={`text-sm font-medium ${getPriorityColor(answer.priority)}`}>
                                                                    P{answer.priority}
                                                                </div>
                                                            </div>

                                                            <p className="text-base-content/70 text-sm line-clamp-2 mb-3">
                                                                {answer.answer}
                                                            </p>

                                                            <div className="flex items-center gap-4 text-xs text-base-content/60">
                                                                {answer.site_name && (
                                                                    <div className="flex items-center gap-1">
                                                                        <i className="fa-duotone fa-solid fa-globe" aria-hidden />
                                                                        <span>{answer.site_name}</span>
                                                                    </div>
                                                                )}
                                                                {answer.keywords.length > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <i className="fa-duotone fa-solid fa-key" aria-hidden />
                                                                        <span>{answer.keywords.length} keywords</span>
                                                                    </div>
                                                                )}
                                                                {answer.tags.length > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        <i className="fa-duotone fa-solid fa-tags" aria-hidden />
                                                                        <span>{answer.tags.length} tags</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1">
                                                                    <i className="fa-duotone fa-solid fa-calendar" aria-hidden />
                                                                    <span>{answer.updated_at ? new Date(answer.updated_at).toLocaleDateString() : 'N/A'}</span>
                                                                </div>
                                                            </div>

                                                            {(answer.keywords.length > 0 || answer.tags.length > 0) && (
                                                                <div className="flex flex-wrap gap-2 mt-3">
                                                                    {answer.keywords.slice(0, 3).map((keyword) => (
                                                                        <span key={keyword} className="badge badge-primary badge-sm">
                                                                            {keyword}
                                                                        </span>
                                                                    ))}
                                                                    {answer.tags.slice(0, 3).map((tag) => (
                                                                        <span key={tag} className="badge badge-secondary badge-sm">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                    {(answer.keywords.length + answer.tags.length) > 6 && (
                                                                        <span className="badge badge-ghost badge-sm">
                                                                            +{(answer.keywords.length + answer.tags.length) - 6} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <HoverScale scale={1.05}>
                                                                <button
                                                                    className="btn btn-sm btn-ghost"
                                                                    onClick={() => handleEdit(answer)}
                                                                    title="Edit answer"
                                                                >
                                                                    <i className="fa-duotone fa-solid fa-edit" aria-hidden />
                                                                </button>
                                                            </HoverScale>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                )}

                {/* Help Section */}
                {!showEditor && (
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="card bg-base-100 border border-base-300">
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
                )}
            </div>
        </AnimatedPage>
    );
}

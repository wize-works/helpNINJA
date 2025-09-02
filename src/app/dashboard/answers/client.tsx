"use client";

import { useState } from 'react';
import AnswerEditor from "@/components/answer-editor";
import { StaggerContainer, StaggerChild, HoverScale } from "@/components/ui/animated-page";

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

interface Filters {
    search?: string;
    siteId?: string;
    status?: string;
}

interface AnswersClientProps {
    answers: Answer[];
    filters: Filters;
}

export default function AnswersClient({ answers, filters }: AnswersClientProps) {
    const [showEditor, setShowEditor] = useState(false);
    const [editingAnswer, setEditingAnswer] = useState<Answer | undefined>();
    const [localAnswers, setLocalAnswers] = useState<Answer[]>(answers);

    const handleSave = async () => {
        setShowEditor(false);
        setEditingAnswer(undefined);

        // Refresh answers from API
        try {
            const params = new URLSearchParams();
            if (filters.siteId) params.set('siteId', filters.siteId);
            if (filters.status && filters.status !== 'all') params.set('status', filters.status);
            if (filters.search) params.set('search', filters.search);

            const response = await fetch(`/api/answers?${params}`);
            if (response.ok) {
                const data = await response.json();
                setLocalAnswers(data);
            }
        } catch (error) {
            console.error('Error refreshing answers:', error);
        }
    };

    const handleDelete = () => {
        setShowEditor(false);
        handleSave(); // Refresh data after deletion
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

    // Use localAnswers for rendering to allow for client-side updates
    const displayAnswers = localAnswers.length > 0 ? localAnswers : answers;

    return (
        <>
            {/* Editor */}
            {showEditor && (
                <StaggerContainer>
                    <StaggerChild>
                        <AnswerEditor
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

            {/* Create Answer Button */}
            {!showEditor && (
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex justify-end mb-4">
                            <HoverScale scale={1.02}>
                                <button
                                    className="btn btn-primary rounded-xl"
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
                    </StaggerChild>
                </StaggerContainer>
            )}

            {/* Answers List */}
            {!showEditor && (
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 border border-base-300 shadow-xl rounded-2xl">
                            <div className="card-body p-0">
                                {displayAnswers.length === 0 ? (
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
                                            className="btn btn-primary rounded-xl"
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
                                        {displayAnswers.map((answer) => (
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
                                                                className="btn btn-sm btn-ghost rounded-lg"
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
        </>
    );
}

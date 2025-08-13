"use client";

import { useState } from 'react';

type CuratedAnswer = {
    id: string;
    question: string;
    answer: string;
    priority: number;
    keywords: string[];
    tags: string[];
    confidence: number;
    source: string;
};

type RagResult = {
    id: string;
    title: string;
    content: string;
    url: string;
    snippet: string;
    relevance_score: number;
    source: string;
};

interface SearchResultsViewerProps {
    curatedAnswers: CuratedAnswer[];
    ragResults: RagResult[];
    query: string;
}

export default function SearchResultsViewer({
    curatedAnswers,
    ragResults,
    query
}: SearchResultsViewerProps) {
    const [activeTab, setActiveTab] = useState<'curated' | 'documents'>('curated');
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

    const toggleExpanded = (id: string) => {
        setExpandedResults(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const highlightQuery = (text: string, query: string) => {
        if (!query || query.length < 2) return text;

        const words = query.toLowerCase().split(' ').filter(w => w.length > 2);
        let highlightedText = text;

        words.forEach(word => {
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark class="bg-warning/30 text-warning-content">$1</mark>');
        });

        return highlightedText;
    };

    const getRelevanceColor = (score: number) => {
        if (score >= 0.8) return 'text-success';
        if (score >= 0.6) return 'text-warning';
        return 'text-error';
    };

    if (curatedAnswers.length === 0 && ragResults.length === 0) {
        return (
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body text-center py-12">
                    <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <i className="fa-duotone fa-solid fa-search text-2xl text-base-content/40" aria-hidden />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">No Results Found</h3>
                    <p className="text-base-content/60">
                        No curated answers or documents match your query. Try different keywords or add more content to your knowledge base.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="tabs tabs-bordered">
                <button
                    className={`tab tab-lg ${activeTab === 'curated' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('curated')}
                >
                    <i className="fa-duotone fa-solid fa-star mr-2" aria-hidden />
                    Curated Answers ({curatedAnswers.length})
                </button>
                <button
                    className={`tab tab-lg ${activeTab === 'documents' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                >
                    <i className="fa-duotone fa-solid fa-file-text mr-2" aria-hidden />
                    Documents ({ragResults.length})
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'curated' && (
                    <>
                        {curatedAnswers.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-star-slash text-3xl mb-3 block" aria-hidden />
                                <p>No curated answers found</p>
                                <p className="text-sm">Consider creating a curated answer for this query</p>
                            </div>
                        ) : (
                            curatedAnswers.map((answer, index) => (
                                <div key={answer.id} className="card bg-base-100 border border-base-300">
                                    <div className="card-body">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-primary/20 text-primary rounded-lg flex items-center justify-center font-bold text-sm">
                                                    {index + 1}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="badge badge-primary badge-sm">
                                                        Priority {answer.priority}
                                                    </div>
                                                    <div className="badge badge-success badge-sm">
                                                        {Math.round(answer.confidence * 100)}% confidence
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="font-semibold text-base-content mb-2">Question:</h4>
                                                <div
                                                    className="text-base-content/80"
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlightQuery(answer.question, query)
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-base-content mb-2">Answer:</h4>
                                                <div
                                                    className="prose max-w-none text-base-content/80"
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlightQuery(answer.answer, query)
                                                    }}
                                                />
                                            </div>

                                            {(answer.keywords.length > 0 || answer.tags.length > 0) && (
                                                <div>
                                                    <h4 className="font-semibold text-base-content mb-2">Keywords & Tags:</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {answer.keywords.map((keyword) => (
                                                            <span key={keyword} className="badge badge-primary badge-sm">
                                                                {keyword}
                                                            </span>
                                                        ))}
                                                        {answer.tags.map((tag) => (
                                                            <span key={tag} className="badge badge-secondary badge-sm">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'documents' && (
                    <>
                        {ragResults.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-file-slash text-3xl mb-3 block" aria-hidden />
                                <p>No documents found</p>
                                <p className="text-sm">Try different keywords or add more content</p>
                            </div>
                        ) : (
                            ragResults.map((result, index) => {
                                const isExpanded = expandedResults.has(result.id);
                                return (
                                    <div key={result.id} className="card bg-base-100 border border-base-300">
                                        <div className="card-body">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-secondary/20 text-secondary rounded-lg flex items-center justify-center font-bold text-sm">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-base-content line-clamp-1">
                                                            {result.title}
                                                        </h4>
                                                        {result.url && (
                                                            <a
                                                                href={result.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-primary hover:text-primary/80 text-sm transition-colors"
                                                            >
                                                                {result.url}
                                                                <i className="fa-duotone fa-solid fa-external-link text-xs ml-1" aria-hidden />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className={`text-sm font-medium ${getRelevanceColor(result.relevance_score)}`}>
                                                        {Math.round(result.relevance_score * 100)}% relevance
                                                    </div>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-square rounded-lg"
                                                        onClick={() => toggleExpanded(result.id)}
                                                    >
                                                        <i className={`fa-duotone fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} aria-hidden />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                {isExpanded ? (
                                                    <div
                                                        className="text-base-content/80 text-sm leading-relaxed"
                                                        dangerouslySetInnerHTML={{
                                                            __html: highlightQuery(result.content, query)
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="text-base-content/80 text-sm leading-relaxed"
                                                        dangerouslySetInnerHTML={{
                                                            __html: highlightQuery(result.snippet, query)
                                                        }}
                                                    />
                                                )}

                                                {!isExpanded && result.content.length > result.snippet.length && (
                                                    <button
                                                        className="text-primary hover:text-primary/80 text-sm mt-2 transition-colors"
                                                        onClick={() => toggleExpanded(result.id)}
                                                    >
                                                        Show more...
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

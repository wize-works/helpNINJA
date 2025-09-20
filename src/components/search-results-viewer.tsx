"use client";

import { useState } from 'react';
import { tagClass } from '@/lib/tags';

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

type FeedbackItem = {
    id: string;
    title: string;
    url?: string;
    type: string;
    status: string;
    priority: string;
    createdAt: string;
    siteDomain?: string;
    snippet: string;
};

interface SearchResultsViewerProps {
    curatedAnswers: CuratedAnswer[];
    ragResults: RagResult[];
    query: string;
    conversations?: Array<{
        id: string;
        sessionId: string;
        lastMessageAt: string;
        siteDomain?: string;
        snippet: string;
        tags?: string[];
    }>;
    feedback?: FeedbackItem[];
}

export default function SearchResultsViewer({
    curatedAnswers,
    ragResults,
    query,
    conversations = [],
    feedback = []
}: SearchResultsViewerProps) {
    const [activeTab, setActiveTab] = useState<'curated' | 'documents' | 'conversations' | 'feedback'>('curated');

    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const formatRelativeTime = (date: Date) => {
        const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
            { amount: 60, unit: 'second' },
            { amount: 60, unit: 'minute' },
            { amount: 24, unit: 'hour' },
            { amount: 7, unit: 'day' },
            { amount: 4.34524, unit: 'week' },
            { amount: 12, unit: 'month' },
            { amount: Infinity, unit: 'year' }
        ];
        let duration = (date.getTime() - Date.now()) / 1000;
        for (const division of DIVISIONS) {
            if (Math.abs(duration) < division.amount) {
                return rtf.format(Math.round(duration), division.unit);
            }
            duration /= division.amount;
        }
        return date.toLocaleString();
    };

    const escapeHtml = (str: string) =>
        str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const highlightQuery = (text: string, query: string) => {
        if (!text) return '';
        const escaped = escapeHtml(text);
        if (!query || query.length < 2) return escaped;

        const words = query
            .split(/\s+/)
            .map(w => w.trim())
            .filter(w => w.length > 2);

        if (words.length === 0) return escaped;

        let highlightedText = escaped;
        for (const word of words) {
            const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
            highlightedText = highlightedText.replace(
                regex,
                '<mark class="bg-warning/30 text-warning-content">$1</mark>'
            );
        }
        return highlightedText;
    };



    if (curatedAnswers.length === 0 && ragResults.length === 0 && conversations.length === 0 && feedback.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <i className="fa-duotone fa-solid fa-search text-2xl text-base-content/40" aria-hidden />
                </div>
                <h3 className="font-semibold text-lg mb-2">No results</h3>
                <p className="text-base-content/60">Try different keywords or add more content to your knowledge base.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="tabs tabs-box tabs-lg space-x-4" role='tablist' aria-label='Search Result Categories'>
                <button role='tab'
                    className={`tab px-4 ${activeTab === 'curated' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('curated')}
                    aria-label='Curated Answers'
                >
                    <i className="fa-duotone fa-solid fa-star mr-2" aria-hidden />
                    Curated Answers ({curatedAnswers.length})
                </button>
                <button role='tab'
                    className={`tab px-4 ${activeTab === 'documents' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('documents')}
                    aria-label='Documents'
                >
                    <i className="fa-duotone fa-solid fa-file-text mr-2" aria-hidden />
                    Documents ({ragResults.length})
                </button>
                <button role='tab'
                    className={`tab px-4 ${activeTab === 'conversations' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('conversations')}
                    aria-label='Conversations'
                >
                    <i className="fa-duotone fa-solid fa-messages mr-2" aria-hidden />
                    Conversations ({conversations.length})
                </button>
                <button role='tab'
                    className={`tab px-4 ${activeTab === 'feedback' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('feedback')}
                    aria-label='Feedback'
                >
                    <i className="fa-duotone fa-solid fa-comments mr-2" aria-hidden />
                    Feedback ({feedback.length})
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6 bg-base-100 p-6 rounded-lg border border-base-200">
                {activeTab === 'curated' && (
                    <>
                        {curatedAnswers.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-star-slash text-3xl mb-3 block" aria-hidden />
                                <p>No curated answers found</p>
                                <p className="text-sm">Consider creating a curated answer for this query</p>
                            </div>
                        ) : (
                            curatedAnswers.map((answer, index) => {
                                const answerSnippet = answer.answer.length > 320 ? `${answer.answer.slice(0, 320)}…` : answer.answer;
                                return (
                                    <article key={answer.id} className="space-y-1 pb-6 border-b border-base-200 last:border-b-0">
                                        <div className="flex items-center gap-2 text-xs text-base-content/60">
                                            <span className="badge badge-ghost badge-xs">Curated</span>
                                            <span>Priority {answer.priority}</span>
                                            <span>•</span>
                                            <span>{Math.round(answer.confidence * 100)}% confidence</span>
                                            {index === 0 && (
                                                <span className="badge badge-primary badge-xs">Featured</span>
                                            )}
                                        </div>
                                        <h3 className="text-xl leading-snug">
                                            <span
                                                className="link link-primary hover:text-primary/80"
                                                dangerouslySetInnerHTML={{ __html: highlightQuery(answer.question, query) }}
                                            />
                                        </h3>
                                        <div
                                            className="text-sm text-base-content/80"
                                            dangerouslySetInnerHTML={{ __html: highlightQuery(answerSnippet, query) }}
                                        />
                                        {(answer.keywords.length > 0 || answer.tags.length > 0) && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {answer.keywords.map((keyword) => (
                                                    <span key={keyword} className="badge badge-outline badge-xs">{keyword}</span>
                                                ))}
                                                {answer.tags.map((tag) => (
                                                    <span key={tag} className="badge badge-outline badge-xs">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                );
                            })
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
                            ragResults.map((result) => {
                                const snippet = result.snippet || (result.content.length > 220 ? `${result.content.slice(0, 220)}…` : result.content);
                                const displayUrl = result.url || '';
                                const hostname = (() => {
                                    try {
                                        return displayUrl ? new URL(displayUrl).hostname : '';
                                    } catch {
                                        return '';
                                    }
                                })();
                                return (
                                    <article key={result.id} className="pb-6 border-b border-base-200 last:border-b-0">
                                        <h3 className="text-xl leading-snug">
                                            {result.url ? (
                                                <a href={result.url} target="_blank" rel="noreferrer" className="link link-primary hover:text-primary/80">
                                                    {result.title || result.url}
                                                </a>
                                            ) : (
                                                <span className="text-base-content">{result.title || 'Document'}</span>
                                            )}
                                        </h3>
                                        {displayUrl && (
                                            <div className="flex items-center gap-2 text-xs text-success/70 truncate mt-1">
                                                {hostname ? (
                                                    <span
                                                        aria-hidden
                                                        className="inline-block w-4 h-4 rounded-[3px] bg-base-200"
                                                        style={{
                                                            backgroundImage: `url(https://icons.duckduckgo.com/ip3/${hostname}.ico)`,
                                                            backgroundSize: 'cover',
                                                        }}
                                                    />
                                                ) : null}
                                                <span className="truncate">{displayUrl}</span>
                                            </div>
                                        )}
                                        <div
                                            className="text-sm text-base-content/80 mt-1"
                                            dangerouslySetInnerHTML={{ __html: highlightQuery(snippet, query) }}
                                        />
                                    </article>
                                );
                            })
                        )}
                    </>
                )}

                {activeTab === 'conversations' && (
                    <>
                        {conversations.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-messages text-3xl mb-3 block" aria-hidden />
                                <p>No conversations found</p>
                            </div>
                        ) : (
                            conversations.map((c) => (
                                <article key={c.id} className="pb-6 border-b border-base-200 last:border-b-0">
                                    <h3 className="text-xl leading-snug">
                                        <a href={`/dashboard/conversations/${c.id}`} className="link link-primary hover:text-primary/80">
                                            Conversation {c.sessionId}
                                        </a>
                                    </h3>
                                    <div className="text-xs text-base-content/60 mt-1 flex items-center gap-2 flex-wrap">
                                        {c.siteDomain ? <span>{c.siteDomain}</span> : null}
                                        {c.siteDomain ? <span>•</span> : null}
                                        <time
                                            dateTime={new Date(c.lastMessageAt).toISOString()}
                                            title={new Date(c.lastMessageAt).toLocaleString()}
                                        >
                                            {formatRelativeTime(new Date(c.lastMessageAt))}
                                        </time>
                                        {c.tags && c.tags.length > 0 && (
                                            <span className="hidden sm:inline">•</span>
                                        )}
                                        {c.tags?.map(tag => (
                                            <span key={tag} className={`badge ${tagClass(tag)} badge-sm capitalize`}>{tag.replace('-', ' ')}</span>
                                        ))}
                                    </div>
                                    {c.snippet && (
                                        <div
                                            className="text-sm text-base-content/80 mt-1"
                                            dangerouslySetInnerHTML={{ __html: highlightQuery(c.snippet, query) }}
                                        />
                                    )}
                                </article>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'feedback' && (
                    <>
                        {feedback.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-comments text-3xl mb-3 block" aria-hidden />
                                <p>No feedback found</p>
                            </div>
                        ) : (
                            feedback.map((f) => (
                                <article key={f.id} className="pb-6 border-b border-base-200 last:border-b-0">
                                    <h3 className="text-xl leading-snug">
                                        {f.url ? (
                                            <a href={f.url} target="_blank" rel="noreferrer" className="link link-primary hover:text-primary/80">
                                                {f.title}
                                            </a>
                                        ) : (
                                            <a href={`/dashboard/feedback?search=${encodeURIComponent(f.title)}`} className="link link-primary hover:text-primary/80">
                                                {f.title}
                                            </a>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-base-content/60 mt-1">
                                        {f.siteDomain ? <span>{f.siteDomain}</span> : null}
                                        {f.siteDomain ? <span>•</span> : null}
                                        <span className={`badge badge-ghost badge-xs`}>{f.type.replace('_', ' ')}</span>
                                        <span className={`badge badge-outline badge-xs`}>{f.status}</span>
                                        <span className={`badge badge-outline badge-xs`}>{f.priority}</span>
                                        <span>•</span>
                                        <time dateTime={new Date(f.createdAt).toISOString()} title={new Date(f.createdAt).toLocaleString()}>
                                            {formatRelativeTime(new Date(f.createdAt))}
                                        </time>
                                    </div>
                                    {f.snippet && (
                                        <div
                                            className="text-sm text-base-content/80 mt-1"
                                            dangerouslySetInnerHTML={{ __html: highlightQuery(f.snippet, query) }}
                                        />
                                    )}
                                </article>
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

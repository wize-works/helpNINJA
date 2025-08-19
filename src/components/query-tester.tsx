"use client";

import { useState } from 'react';
import SiteSelector from './site-selector';
import { HoverScale } from './ui/animated-page';

type TestResult = {
    query: string;
    search_time_ms: number;
    curated_answers: Array<{
        id: string;
        question: string;
        answer: string;
        priority: number;
        keywords: string[];
        tags: string[];
        confidence: number;
        source: string;
    }>;
    rag_results: Array<{
        id: string;
        title: string;
        content: string;
        url: string;
        snippet: string;
        relevance_score: number;
        source: string;
    }>;
    ai_response?: {
        answer: string;
        confidence: number;
        response_time_ms: number;
        source: string;
        model?: string;
        tokens_used?: number;
        error?: string;
    };
    total_time_ms: number;
    metadata: {
        tenant_id: string;
        site_id?: string;
        timestamp: string;
        search_method: string;
        curated_count: number;
        document_count: number;
        ai_enabled: boolean;
    };
};

interface QueryTesterProps {
    onResultsChange?: (results: TestResult | null) => void;
}

export default function QueryTester({ onResultsChange }: QueryTesterProps) {
    const [query, setQuery] = useState('');
    const [siteId, setSiteId] = useState('');
    const [includeAI, setIncludeAI] = useState(true);
    const [maxResults, setMaxResults] = useState(8);
    const [voice, setVoice] = useState('friendly');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<TestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async () => {
        if (!query.trim()) {
            setError('Please enter a query to test');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/playground/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: query.trim(),
                    siteId: siteId || undefined,
                    includeAI,
                    maxResults,
                    voice
                })
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data);
                onResultsChange?.(data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to test query');
                setResults(null);
                onResultsChange?.(null);
            }
        } catch (error) {
            console.error('Query test error:', error);
            setError('Network error. Please try again.');
            setResults(null);
            onResultsChange?.(null);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleTest();
        }
    };

    // Confidence helpers removed (not used in current UI)

    return (
        <div className="space-y-6">
            {/* Query Input Form */}
            <div className="card bg-base-100 rounded-2xl shadow-sm">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-flask text-lg text-primary" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-base-content">Test Knowledge Base</h3>
                            <p className="text-base-content/60 text-sm">Ask questions to test your AI responses</p>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleTest(); }}>
                        {/* Main Query Input */}
                        <fieldset className="space-y-3">
                            <legend className="text-base font-semibold text-base-content mb-2">Query Input</legend>
                            <label className="block">
                                <span className="text-sm font-medium text-base-content mb-2 block">
                                    Test Question
                                    <span className="text-error ml-1">*</span>
                                </span>
                                <textarea
                                    className={`textarea textarea-bordered w-full h-24 transition-all duration-200 focus:scale-[1.02] ${error && !query.trim() ? 'textarea-error' : 'focus:textarea-primary'
                                        }`}
                                    placeholder="How do I reset my password?"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading}
                                    required
                                />
                                <div className="text-xs text-base-content/60 mt-1">
                                    Press Ctrl+Enter to test quickly • {query.length}/500 characters
                                </div>
                            </label>
                        </fieldset>

                        {/* Advanced Settings */}
                        <fieldset className="space-y-4">
                            <legend className="text-base font-semibold text-base-content mb-3">Test Configuration</legend>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Site Filter */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Site Filter</span>
                                    <SiteSelector
                                        value={siteId}
                                        onChange={(value) => setSiteId(value || '')}
                                        allowNone={true}
                                        noneLabel="All sites"
                                        placeholder="Any site"
                                        disabled={loading}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Limit search to specific site
                                    </div>
                                </label>

                                {/* Max Results */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Max Results</span>
                                    <select
                                        className="select select-bordered w-full focus:select-primary transition-all duration-200"
                                        value={maxResults}
                                        onChange={(e) => setMaxResults(parseInt(e.target.value))}
                                        disabled={loading}
                                    >
                                        <option value={4}>4 results</option>
                                        <option value={8}>8 results</option>
                                        <option value={12}>12 results</option>
                                        <option value={16}>16 results</option>
                                    </select>
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Number of search results
                                    </div>
                                </label>

                                {/* AI Voice */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Response Tone</span>
                                    <select
                                        className="select select-bordered w-full focus:select-primary transition-all duration-200"
                                        value={voice}
                                        onChange={(e) => setVoice(e.target.value)}
                                        disabled={loading}
                                    >
                                        <option value="friendly">🙂 Friendly</option>
                                        <option value="professional">💼 Professional</option>
                                        <option value="casual">😎 Casual</option>
                                        <option value="technical">🔧 Technical</option>
                                    </select>
                                    <div className="text-xs text-base-content/60 mt-1">
                                        AI response personality
                                    </div>
                                </label>

                                {/* AI Toggle */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">AI Response</span>
                                    <div className="flex items-center gap-3 h-12 px-3 border border-base-300 rounded-lg bg-base-200/50">
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-primary toggle-sm"
                                            checked={includeAI}
                                            onChange={(e) => setIncludeAI(e.target.checked)}
                                            disabled={loading}
                                        />
                                        <span className="text-sm font-medium">
                                            {includeAI ? 'Generate AI response' : 'Search only'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-base-content/60 mt-1">
                                        {includeAI ? 'Get AI-generated answer' : 'Return search results only'}
                                    </div>
                                </label>
                            </div>
                        </fieldset>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                            <div className="text-sm text-base-content/60">
                                {results && (
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1">
                                            <i className="fa-duotone fa-solid fa-star text-xs text-secondary" aria-hidden />
                                            {results.metadata.curated_count} curated
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <i className="fa-duotone fa-solid fa-file-text text-xs text-accent" aria-hidden />
                                            {results.metadata.document_count} documents
                                        </span>
                                        {results.ai_response && (
                                            <span className="flex items-center gap-1">
                                                <i className="fa-duotone fa-solid fa-stopwatch text-xs text-info" aria-hidden />
                                                {results.total_time_ms}ms
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <HoverScale scale={1.02}>
                                <button
                                    type="submit"
                                    className={`btn btn-primary rounded-xl ${loading ? 'loading' : ''} min-w-32`}
                                    disabled={loading || !query.trim()}
                                >
                                    {loading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-duotone fa-solid fa-flask mr-2" aria-hidden />
                                            Test Query
                                        </>
                                    )}
                                </button>
                            </HoverScale>
                        </div>
                    </form>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-gradient-to-r from-error/10 to-error/5 border border-error/20 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-error/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fa-duotone fa-solid fa-triangle-exclamation text-sm text-error" aria-hidden />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-error mb-1">Test Failed</h4>
                            <p className="text-sm text-error/80">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="space-y-6">
                    {/* AI Response */}
                    {results.ai_response && (
                        <div className="card bg-base-100 shadow-xl rounded-2xl">
                            <div className="card-body">
                                <div className="flex items-start justify-between mb-4">
                                    <h4 className="card-title">
                                        <i className="fa-duotone fa-solid fa-robot mr-2 text-secondary" aria-hidden />
                                        AI Response
                                    </h4>
                                    <div className="flex items-center gap-3">
                                        <div className={`badge ${results.ai_response.confidence >= 0.7 ? 'badge-success' : results.ai_response.confidence >= 0.5 ? 'badge-warning' : 'badge-error'}`}>
                                            {Math.round(results.ai_response.confidence * 100)}% confidence
                                        </div>
                                        <div className="text-xs text-base-content/60">
                                            {results.ai_response.response_time_ms}ms
                                        </div>
                                    </div>
                                </div>

                                {results.ai_response.error ? (
                                    <div className="alert alert-error">
                                        <span>{results.ai_response.error}</span>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="prose max-w-none mb-4">
                                            <p className="text-base-content">{results.ai_response.answer}</p>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-base-content/60">
                                            <span>Source: {results.ai_response.source}</span>
                                            {results.ai_response.model && (
                                                <span>Model: {results.ai_response.model}</span>
                                            )}
                                            {results.ai_response.tokens_used && (
                                                <span>~{results.ai_response.tokens_used} tokens</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="stat bg-base-100 border border-base-300 rounded-xl">
                            <div className="stat-title">Search Time</div>
                            <div className="stat-value text-lg">{results.search_time_ms}ms</div>
                            <div className="stat-desc">Knowledge base query</div>
                        </div>

                        <div className="stat bg-base-100 border border-base-300 rounded-xl">
                            <div className="stat-title">Curated</div>
                            <div className="stat-value text-lg text-primary">{results.curated_answers.length}</div>
                            <div className="stat-desc">Manual answers</div>
                        </div>

                        <div className="stat bg-base-100 border border-base-300 rounded-xl">
                            <div className="stat-title">Documents</div>
                            <div className="stat-value text-lg text-secondary">{results.rag_results.length}</div>
                            <div className="stat-desc">From knowledge base</div>
                        </div>

                        <div className="stat bg-base-100 border border-base-300 rounded-xl">
                            <div className="stat-title">Total Time</div>
                            <div className="stat-value text-lg">{results.total_time_ms}ms</div>
                            <div className="stat-desc">End-to-end</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

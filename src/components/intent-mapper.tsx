"use client";

import { useState } from 'react';

interface IntentMapperProps {
    keywords: string[];
    tags: string[];
    onKeywordsChange: (keywords: string[]) => void;
    onTagsChange: (tags: string[]) => void;
    disabled?: boolean;
}

export default function IntentMapper({
    keywords,
    tags,
    onKeywordsChange,
    onTagsChange,
    disabled = false
}: IntentMapperProps) {
    const [keywordInput, setKeywordInput] = useState('');
    const [tagInput, setTagInput] = useState('');

    const addKeyword = () => {
        const keyword = keywordInput.trim().toLowerCase();
        if (keyword && !keywords.includes(keyword)) {
            onKeywordsChange([...keywords, keyword]);
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        onKeywordsChange(keywords.filter(k => k !== keyword));
    };

    const addTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag)) {
            onTagsChange([...tags, tag]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        onTagsChange(tags.filter(t => t !== tag));
    };

    const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addKeyword();
        }
    };

    const handleTagKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Keywords */}
            <div className="space-y-3">
                <div>
                    <label className="label">
                        <span className="label-text font-medium">Keywords</span>
                        <span className="label-text-alt">Match user questions</span>
                    </label>
                    <div className="join w-full">
                        <input
                            type="text"
                            className="input input-bordered join-item flex-1"
                            placeholder="password, reset, login..."
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyPress={handleKeywordKeyPress}
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            className="btn btn-outline join-item"
                            onClick={addKeyword}
                            disabled={disabled || !keywordInput.trim()}
                        >
                            <i className="fa-duotone fa-solid fa-plus" aria-hidden />
                        </button>
                    </div>
                    <div className="text-xs text-base-content/60 mt-1">
                        Keywords that should trigger this answer (e.g., &quot;password&quot;, &quot;reset&quot;, &quot;login&quot;)
                    </div>
                </div>

                {keywords.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-base-content/80">
                            {keywords.length} keyword{keywords.length > 1 ? 's' : ''}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword) => (
                                <div
                                    key={keyword}
                                    className="badge badge-primary gap-2 py-3 px-3"
                                >
                                    <i className="fa-duotone fa-solid fa-key text-xs" aria-hidden />
                                    <span>{keyword}</span>
                                    <button
                                        type="button"
                                        className="text-primary-content/80 hover:text-primary-content"
                                        onClick={() => removeKeyword(keyword)}
                                        disabled={disabled}
                                        aria-label={`Remove keyword: ${keyword}`}
                                    >
                                        <i className="fa-duotone fa-solid fa-times text-xs" aria-hidden />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {keywords.length === 0 && (
                    <div className="text-center py-4 text-base-content/50 text-sm">
                        <i className="fa-duotone fa-solid fa-key-skeleton text-lg mb-2 block" aria-hidden />
                        No keywords yet
                    </div>
                )}
            </div>

            {/* Tags */}
            <div className="space-y-3">
                <div>
                    <label className="label">
                        <span className="label-text font-medium">Tags</span>
                        <span className="label-text-alt">Organize & categorize</span>
                    </label>
                    <div className="join w-full">
                        <input
                            type="text"
                            className="input input-bordered join-item flex-1"
                            placeholder="account, security, billing..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={handleTagKeyPress}
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            className="btn btn-outline join-item"
                            onClick={addTag}
                            disabled={disabled || !tagInput.trim()}
                        >
                            <i className="fa-duotone fa-solid fa-plus" aria-hidden />
                        </button>
                    </div>
                    <div className="text-xs text-base-content/60 mt-1">
                        Categories for organization and filtering (e.g., &quot;account&quot;, &quot;billing&quot;, &quot;technical&quot;)
                    </div>
                </div>

                {tags.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-sm font-medium text-base-content/80">
                            {tags.length} tag{tags.length > 1 ? 's' : ''}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                                <div
                                    key={tag}
                                    className="badge badge-secondary gap-2 py-3 px-3"
                                >
                                    <i className="fa-duotone fa-solid fa-tag text-xs" aria-hidden />
                                    <span>{tag}</span>
                                    <button
                                        type="button"
                                        className="text-secondary-content/80 hover:text-secondary-content"
                                        onClick={() => removeTag(tag)}
                                        disabled={disabled}
                                        aria-label={`Remove tag: ${tag}`}
                                    >
                                        <i className="fa-duotone fa-solid fa-times text-xs" aria-hidden />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {tags.length === 0 && (
                    <div className="text-center py-4 text-base-content/50 text-sm">
                        <i className="fa-duotone fa-solid fa-tags text-lg mb-2 block" aria-hidden />
                        No tags yet
                    </div>
                )}
            </div>
        </div>
    );
}

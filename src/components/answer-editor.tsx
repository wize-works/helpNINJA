"use client";

import { useState, useEffect } from 'react';
import SiteSelector from './site-selector';
import IntentMapper from './intent-mapper';
import { HoverScale } from './ui/animated-page';

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

interface AnswerEditorProps {
    tenantId: string;
    answer?: Answer;
    onSave?: (answer: Answer) => void;
    onCancel?: () => void;
    onDelete?: (answerId: string) => void;
}

export default function AnswerEditor({ 
    tenantId, 
    answer, 
    onSave, 
    onCancel, 
    onDelete 
}: AnswerEditorProps) {
    const [formData, setFormData] = useState<Answer>({
        question: '',
        answer: '',
        keywords: [],
        tags: [],
        priority: 0,
        status: 'active',
        site_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (answer) {
            setFormData({
                ...answer,
                site_id: answer.site_id || ''
            });
        }
    }, [answer]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.question.trim()) {
            newErrors.question = 'Question is required';
        }
        
        if (!formData.answer.trim()) {
            newErrors.answer = 'Answer is required';
        }
        
        if (formData.priority < 0 || formData.priority > 100) {
            newErrors.priority = 'Priority must be between 0 and 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        
        try {
            const url = answer?.id ? `/api/answers/${answer.id}` : '/api/answers';
            const method = answer?.id ? 'PUT' : 'POST';
            
            const payload = {
                ...formData,
                siteId: formData.site_id || undefined
            };
            delete payload.site_id; // Remove the frontend field
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                onSave?.(answer?.id ? formData : { ...formData, id: result.id });
            } else {
                const error = await response.json();
                setErrors({ general: error.error || 'Failed to save answer' });
            }
        } catch (error) {
            console.error('Error saving answer:', error);
            setErrors({ general: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!answer?.id) return;
        
        if (!confirm('Are you sure you want to delete this answer? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        
        try {
            const response = await fetch(`/api/answers/${answer.id}`, {
                method: 'DELETE',
                headers: { 'x-tenant-id': tenantId }
            });

            if (response.ok) {
                onDelete?.(answer.id);
            } else {
                const error = await response.json();
                setErrors({ general: error.error || 'Failed to delete answer' });
            }
        } catch (error) {
            console.error('Error deleting answer:', error);
            setErrors({ general: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (field: keyof Answer, value: string | string[] | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="card bg-base-100 rounded-2xl shadow-sm">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <i className="fa-duotone fa-solid fa-comment-question text-lg text-primary" aria-hidden />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-base-content">
                                {answer?.id ? 'Edit Answer' : 'Create New Answer'}
                            </h3>
                            <p className="text-base-content/60 text-sm">
                                {answer?.id ? 'Update your curated answer' : 'Create a new answer for common questions'}
                            </p>
                        </div>
                    </div>
                    {answer?.id && (
                        <div className="flex items-center gap-3">
                            <div className={`badge ${
                                formData.status === 'active' ? 'badge-success' :
                                formData.status === 'draft' ? 'badge-warning' : 'badge-error'
                            }`}>
                                {formData.status === 'active' ? '🟢 Active' : 
                                 formData.status === 'draft' ? '🟡 Draft' : '🔴 Disabled'}
                            </div>
                            <div className="text-xs text-base-content/60 bg-base-200/50 px-2 py-1 rounded">
                                Priority: {formData.priority}
                            </div>
                        </div>
                    )}
                </div>

                {errors.general && (
                    <div className="bg-gradient-to-r from-error/10 to-error/5 border border-error/20 rounded-2xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-error/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <i className="fa-duotone fa-solid fa-triangle-exclamation text-sm text-error" aria-hidden />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-error mb-1">Save Failed</h4>
                                <p className="text-sm text-error/80">{errors.general}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <fieldset className="space-y-4">
                        <legend className="text-base font-semibold text-base-content mb-3">Answer Content</legend>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-4">
                                {/* Question Input */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Question or Intent
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                    <textarea
                                        className={`textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all duration-200 focus:scale-[1.02] ${errors.question ? 'textarea-error' : ''}`}
                                        placeholder="What question should this answer respond to? e.g., 'How do I reset my password?'"
                                        value={formData.question}
                                        onChange={(e) => updateFormData('question', e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    {errors.question && (
                                        <div className="text-xs text-error mt-1">{errors.question}</div>
                                    )}
                                    <div className="text-xs text-base-content/60 mt-1">
                                        {formData.question.length}/500 characters
                                    </div>
                                </label>

                                {/* Answer Input */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">
                                        Answer
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                    <textarea
                                        className={`textarea textarea-bordered w-full h-32 focus:textarea-primary transition-all duration-200 focus:scale-[1.02] ${errors.answer ? 'textarea-error' : ''}`}
                                        placeholder="Provide a clear, helpful answer that will be shown to users..."
                                        value={formData.answer}
                                        onChange={(e) => updateFormData('answer', e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    {errors.answer && (
                                        <div className="text-xs text-error mt-1">{errors.answer}</div>
                                    )}
                                    <div className="text-xs text-base-content/60 mt-1">
                                        This answer will be prioritized over AI-generated responses • {formData.answer.length}/2000 characters
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                {/* Priority Slider */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Priority</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        className="range range-primary w-full"
                                        value={formData.priority}
                                        onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
                                        disabled={loading}
                                    />
                                    <div className="w-full flex justify-between text-xs px-2 mt-1">
                                        <span>Low (0)</span>
                                        <span className="font-semibold text-primary">{formData.priority}</span>
                                        <span>High (100)</span>
                                    </div>
                                    {errors.priority && (
                                        <div className="text-xs text-error mt-1">{errors.priority}</div>
                                    )}
                                </label>

                                {/* Status Select */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Status</span>
                                    <select
                                        className="select select-bordered w-full focus:select-primary transition-all duration-200"
                                        value={formData.status}
                                        onChange={(e) => updateFormData('status', e.target.value as 'active' | 'draft' | 'disabled')}
                                        disabled={loading}
                                    >
                                        <option value="active">🟢 Active - Answer is live</option>
                                        <option value="draft">🟡 Draft - Not yet published</option>
                                        <option value="disabled">🔴 Disabled - Hidden from users</option>
                                    </select>
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Control answer visibility
                                    </div>
                                </label>

                                {/* Site Association */}
                                <label className="block">
                                    <span className="text-sm font-medium text-base-content mb-2 block">Associated Site</span>
                                    <SiteSelector
                                        tenantId={tenantId}
                                        value={formData.site_id}
                                        onChange={(value) => updateFormData('site_id', value || '')}
                                        allowNone={true}
                                        noneLabel="All sites"
                                        placeholder="Select a site"
                                        disabled={loading}
                                    />
                                    <div className="text-xs text-base-content/60 mt-1">
                                        Optional: Associate with a specific site
                                    </div>
                                </label>
                            </div>
                        </div>
                    </fieldset>

                    {/* Intent Mapping */}
                    <fieldset className="space-y-4">
                        <legend className="text-base font-semibold text-base-content mb-3">Intent Mapping</legend>
                        
                        <div className="bg-base-200/20 rounded-xl p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                                    <i className="fa-duotone fa-solid fa-tags text-secondary" aria-hidden />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-base-content">AI Matching</h4>
                                    <p className="text-sm text-base-content/60">
                                        Add keywords and tags to help the AI match this answer to user questions
                                    </p>
                                </div>
                            </div>
                            
                            <IntentMapper
                                keywords={formData.keywords}
                                tags={formData.tags}
                                onKeywordsChange={(keywords) => updateFormData('keywords', keywords)}
                                onTagsChange={(tags) => updateFormData('tags', tags)}
                                disabled={loading}
                            />
                        </div>
                    </fieldset>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-base-200/60">
                        <div className="text-sm text-base-content/60">
                            {answer?.id ? 'Update your curated answer' : 'Create a new answer for your knowledge base'}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {onCancel && (
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={onCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            )}
                            
                            <HoverScale scale={1.02}>
                                <button
                                    type="submit"
                                    className={`btn btn-primary ${loading ? 'loading' : ''} min-w-32`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-duotone fa-solid fa-save mr-2" aria-hidden />
                                            {answer?.id ? 'Update Answer' : 'Create Answer'}
                                        </>
                                    )}
                                </button>
                            </HoverScale>
                        </div>
                    </div>

                    {/* Delete Action */}
                    {answer?.id && onDelete && (
                        <div className="flex justify-end pt-2 border-t border-base-200/40">
                            <HoverScale scale={1.02}>
                                <button
                                    type="button"
                                    className="btn btn-error btn-outline btn-sm"
                                    onClick={handleDelete}
                                    disabled={loading}
                                >
                                    <i className="fa-duotone fa-solid fa-trash mr-2" aria-hidden />
                                    Delete Answer
                                </button>
                            </HoverScale>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

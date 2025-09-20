"use client";

import { useState } from 'react';
import { toast } from '@/lib/toast';
import FileUpload, { FileUploadItem } from './file-upload';

export interface FeedbackFormData {
    tenantId?: string;
    conversationId?: string;
    sessionId?: string;
    type: 'bug' | 'feature_request' | 'improvement' | 'general' | 'ui_ux' | 'performance';
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    description: string;
    stepsToReproduce?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    userEmail?: string;
    userName?: string;
    contactMethod?: 'email' | 'phone' | 'slack' | 'none';
    contactValue?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    attachments?: FileUploadItem[];
}

interface FeedbackFormProps {
    mode: 'widget' | 'dashboard';
    tenantId?: string;
    conversationId?: string;
    sessionId?: string;
    initialData?: Partial<FeedbackFormData>;
    onSubmit?: (data: FeedbackFormData) => Promise<void>;
    onSuccess?: (feedbackId: string) => void;
    onCancel?: () => void;
    className?: string;
}

const FEEDBACK_TYPES = [
    { value: 'bug', label: 'Bug Report', icon: 'fa-bug', description: 'Something is broken or not working correctly' },
    { value: 'feature_request', label: 'Feature Request', icon: 'fa-lightbulb', description: 'Suggest a new feature or enhancement' },
    { value: 'improvement', label: 'Improvement', icon: 'fa-arrow-up', description: 'Make something better or more efficient' },
    { value: 'ui_ux', label: 'UI/UX Feedback', icon: 'fa-paint-brush', description: 'Visual design or user experience suggestions' },
    { value: 'performance', label: 'Performance Issue', icon: 'fa-tachometer', description: 'Speed, loading, or responsiveness concerns' },
    { value: 'general', label: 'General Feedback', icon: 'fa-message', description: 'Other comments or suggestions' }
];

const PRIORITY_LEVELS = [
    { value: 'low', label: 'Low', color: 'text-success', description: 'Nice to have' },
    { value: 'medium', label: 'Medium', color: 'text-warning', description: 'Important improvement' },
    { value: 'high', label: 'High', color: 'text-error', description: 'Significant issue' },
    { value: 'urgent', label: 'Urgent', color: 'text-error', description: 'Blocking or critical issue' }
];

const CONTACT_METHODS = [
    { value: 'email', label: 'Email', icon: 'fa-envelope' },
    { value: 'phone', label: 'Phone', icon: 'fa-phone' },
    { value: 'slack', label: 'Slack', icon: 'fa-slack' },
    { value: 'none', label: 'No contact needed', icon: 'fa-eye-slash' }
];

export default function FeedbackForm({
    mode,
    tenantId,
    conversationId,
    sessionId,
    initialData,
    onSubmit,
    onSuccess,
    onCancel,
    className = ''
}: FeedbackFormProps) {
    const [formData, setFormData] = useState<FeedbackFormData>({
        type: 'general',
        priority: 'medium',
        title: '',
        description: '',
        contactMethod: mode === 'widget' ? 'email' : 'none',
        tags: [],
        metadata: {},
        attachments: [],
        ...initialData
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showBugFields, setShowBugFields] = useState(false);
    const [showContactFields, setShowContactFields] = useState(mode === 'widget');
    const [attachmentFiles, setAttachmentFiles] = useState<FileUploadItem[]>([]);

    // Update bug fields visibility when type changes
    const handleTypeChange = (type: FeedbackFormData['type']) => {
        setFormData(prev => ({ ...prev, type }));
        setShowBugFields(type === 'bug');

        // Auto-adjust priority for bugs
        if (type === 'bug' && formData.priority === 'low') {
            setFormData(prev => ({ ...prev, priority: 'medium' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        } else if (formData.title.length > 200) {
            newErrors.title = 'Title must be 200 characters or less';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.length < 10) {
            newErrors.description = 'Please provide more detail (at least 10 characters)';
        } else if (formData.description.length > 2000) {
            newErrors.description = 'Description must be 2000 characters or less';
        }

        // Bug-specific validation
        if (formData.type === 'bug') {
            if (formData.stepsToReproduce && formData.stepsToReproduce.length > 1000) {
                newErrors.stepsToReproduce = 'Steps must be 1000 characters or less';
            }
            if (formData.expectedBehavior && formData.expectedBehavior.length > 500) {
                newErrors.expectedBehavior = 'Expected behavior must be 500 characters or less';
            }
            if (formData.actualBehavior && formData.actualBehavior.length > 500) {
                newErrors.actualBehavior = 'Actual behavior must be 500 characters or less';
            }
        }

        // Contact validation
        if (formData.contactMethod && formData.contactMethod !== 'none') {
            if (!formData.contactValue?.trim()) {
                newErrors.contactValue = 'Contact information is required';
            } else if (formData.contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactValue)) {
                newErrors.contactValue = 'Please enter a valid email address';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error({ message: 'Please fix the errors below' });
            return;
        }

        setLoading(true);
        const toastId = toast.loading({ message: 'Submitting feedback...' });

        try {
            // Capture additional metadata
            const metadata = {
                ...formData.metadata,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                widgetVersion: mode === 'widget' ? '1.0' : undefined,
                browserInfo: {
                    language: navigator.language,
                    platform: navigator.platform,
                    cookieEnabled: navigator.cookieEnabled,
                    onLine: navigator.onLine
                }
            };

            const submissionData: FeedbackFormData = {
                ...formData,
                tenantId: tenantId || formData.tenantId,
                conversationId: conversationId || formData.conversationId,
                sessionId: sessionId || formData.sessionId,
                metadata,
                attachments: attachmentFiles
            };

            if (onSubmit) {
                await onSubmit(submissionData);
            } else {
                // Default API submission
                const response = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submissionData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to submit feedback');
                }

                const result = await response.json();

                // Upload attachments if any
                if (attachmentFiles.length > 0) {
                    try {
                        await uploadAttachments(result.id, attachmentFiles);
                        toast.success({
                            message: `Feedback submitted with ${attachmentFiles.length} attachment(s)!`,
                            id: toastId
                        });
                    } catch (uploadError) {
                        console.warn('Attachment upload failed:', uploadError);
                        toast.success({
                            message: 'Feedback submitted, but some attachments failed to upload.',
                            id: toastId
                        });
                    }
                } else {
                    toast.success({
                        message: result.escalated
                            ? 'Feedback submitted and escalated for immediate attention!'
                            : 'Thank you for your feedback!',
                        id: toastId
                    });
                }

                if (onSuccess) {
                    onSuccess(result.id);
                }
            }

        } catch (error) {
            console.error('Feedback submission error:', error);
            toast.error({
                message: error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.',
                id: toastId
            });
        } finally {
            setLoading(false);
        }
    };

    const updateFormData = (field: keyof FeedbackFormData, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear field error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const uploadAttachments = async (feedbackId: string, files: FileUploadItem[]): Promise<void> => {
        const formData = new FormData();
        formData.append('feedbackId', feedbackId);

        files.forEach((fileItem) => {
            formData.append('files', fileItem.file);
        });

        const response = await fetch('/api/feedback/attachments', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to upload attachments');
        }

        return response.json();
    };

    const handleAttachmentFilesChange = (files: FileUploadItem[]) => {
        setAttachmentFiles(files);
        updateFormData('attachments', files);
    };

    return (
        <div className={`bg-base-100 ${className}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="text-center pb-4">
                    <h3 className="text-lg font-semibold text-base-content mb-2">
                        <i className="fa-duotone fa-solid fa-comment-dots text-primary mr-2" />
                        Share Your Feedback
                    </h3>
                    <p className="text-sm text-base-content/60">
                        Help us improve by sharing your thoughts, reporting issues, or suggesting features
                    </p>
                </div>

                {/* Feedback Type */}
                <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-base-content mb-3">What type of feedback is this?</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {FEEDBACK_TYPES.map((type) => (
                            <label
                                key={type.value}
                                className={`cursor-pointer border rounded-xl p-4 transition-all duration-200 hover:border-primary/50 ${formData.type === type.value
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-base-300 hover:bg-base-50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="type"
                                    value={type.value}
                                    checked={formData.type === type.value}
                                    onChange={(e) => handleTypeChange(e.target.value as FeedbackFormData['type'])}
                                    className="sr-only"
                                />
                                <div className="flex items-start gap-3">
                                    <i className={`fa-duotone fa-solid ${type.icon} text-lg ${formData.type === type.value ? 'text-primary' : 'text-base-content/40'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-medium ${formData.type === type.value ? 'text-primary' : 'text-base-content'
                                            }`}>
                                            {type.label}
                                        </div>
                                        <div className="text-xs text-base-content/60 mt-1">
                                            {type.description}
                                        </div>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {/* Priority Level */}
                <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-base-content mb-3">Priority Level</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRIORITY_LEVELS.map((priority) => (
                            <label
                                key={priority.value}
                                className={`cursor-pointer border rounded-lg p-3 text-center transition-all duration-200 hover:border-primary/50 ${formData.priority === priority.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-base-300'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="priority"
                                    value={priority.value}
                                    checked={formData.priority === priority.value}
                                    onChange={(e) => updateFormData('priority', e.target.value)}
                                    className="sr-only"
                                />
                                <div className={`text-sm font-medium ${formData.priority === priority.value ? 'text-primary' : priority.color
                                    }`}>
                                    {priority.label}
                                </div>
                                <div className="text-xs text-base-content/60 mt-1">
                                    {priority.description}
                                </div>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {/* Title */}
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-medium">
                            Title <span className="text-error">*</span>
                        </span>
                        <span className="label-text-alt text-base-content/60">
                            {formData.title.length}/200
                        </span>
                    </label>
                    <input
                        type="text"
                        className={`input input-bordered w-full focus:input-primary transition-all duration-200 focus:scale-[1.02] ${errors.title ? 'input-error' : ''
                            }`}
                        placeholder="Brief summary of your feedback..."
                        value={formData.title}
                        onChange={(e) => updateFormData('title', e.target.value)}
                        disabled={loading}
                        maxLength={200}
                        required
                    />
                    {errors.title && (
                        <label className="label">
                            <span className="label-text-alt text-error">
                                <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" />
                                {errors.title}
                            </span>
                        </label>
                    )}
                </div>

                {/* Description */}
                <div className="form-control">
                    <label className="label">
                        <span className="label-text font-medium">
                            Description <span className="text-error">*</span>
                        </span>
                        <span className="label-text-alt text-base-content/60">
                            {formData.description.length}/2000
                        </span>
                    </label>
                    <textarea
                        className={`textarea textarea-bordered w-full h-32 focus:textarea-primary transition-all duration-200 focus:scale-[1.02] ${errors.description ? 'textarea-error' : ''
                            }`}
                        placeholder="Please provide detailed information about your feedback..."
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        disabled={loading}
                        maxLength={2000}
                        required
                    />
                    {errors.description && (
                        <label className="label">
                            <span className="label-text-alt text-error">
                                <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" />
                                {errors.description}
                            </span>
                        </label>
                    )}
                </div>

                {/* Bug-specific fields */}
                {showBugFields && (
                    <div className="space-y-4 border border-base-300 rounded-xl p-4 bg-base-50">
                        <h4 className="text-sm font-medium text-base-content flex items-center gap-2">
                            <i className="fa-duotone fa-solid fa-bug text-error" />
                            Bug Report Details
                        </h4>

                        {/* Steps to Reproduce */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Steps to Reproduce</span>
                                <span className="label-text-alt text-base-content/60">
                                    {(formData.stepsToReproduce || '').length}/1000
                                </span>
                            </label>
                            <textarea
                                className={`textarea textarea-bordered w-full h-24 focus:textarea-primary transition-all duration-200 ${errors.stepsToReproduce ? 'textarea-error' : ''
                                    }`}
                                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                                value={formData.stepsToReproduce || ''}
                                onChange={(e) => updateFormData('stepsToReproduce', e.target.value)}
                                disabled={loading}
                                maxLength={1000}
                            />
                            {errors.stepsToReproduce && (
                                <label className="label">
                                    <span className="label-text-alt text-error">{errors.stepsToReproduce}</span>
                                </label>
                            )}
                        </div>

                        {/* Expected vs Actual Behavior */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Expected Behavior</span>
                                    <span className="label-text-alt text-base-content/60">
                                        {(formData.expectedBehavior || '').length}/500
                                    </span>
                                </label>
                                <textarea
                                    className={`textarea textarea-bordered w-full h-20 focus:textarea-primary transition-all duration-200 ${errors.expectedBehavior ? 'textarea-error' : ''
                                        }`}
                                    placeholder="What should happen..."
                                    value={formData.expectedBehavior || ''}
                                    onChange={(e) => updateFormData('expectedBehavior', e.target.value)}
                                    disabled={loading}
                                    maxLength={500}
                                />
                                {errors.expectedBehavior && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.expectedBehavior}</span>
                                    </label>
                                )}
                            </div>

                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Actual Behavior</span>
                                    <span className="label-text-alt text-base-content/60">
                                        {(formData.actualBehavior || '').length}/500
                                    </span>
                                </label>
                                <textarea
                                    className={`textarea textarea-bordered w-full h-20 focus:textarea-primary transition-all duration-200 ${errors.actualBehavior ? 'textarea-error' : ''
                                        }`}
                                    placeholder="What actually happens..."
                                    value={formData.actualBehavior || ''}
                                    onChange={(e) => updateFormData('actualBehavior', e.target.value)}
                                    disabled={loading}
                                    maxLength={500}
                                />
                                {errors.actualBehavior && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">{errors.actualBehavior}</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* File Attachments */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <i className="fa-duotone fa-solid fa-paperclip text-primary" />
                        <span className="text-sm font-medium text-base-content">
                            Attachments <span className="text-xs text-base-content/60">(optional)</span>
                        </span>
                    </div>
                    <div className="text-xs text-base-content/60 mb-3">
                        Add screenshots, documents, or files to help explain your feedback
                    </div>
                    <FileUpload
                        onFilesChange={handleAttachmentFilesChange}
                        disabled={loading}
                        compact={mode === 'widget'}
                        maxFiles={5}
                        maxFileSize={10 * 1024 * 1024} // 10MB
                        accept="image/*,.pdf,.doc,.docx,.txt,.log,.csv,.json"
                    />
                </div>

                {/* Contact Information Toggle */}
                <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={showContactFields}
                            onChange={(e) => {
                                setShowContactFields(e.target.checked);
                                if (!e.target.checked) {
                                    updateFormData('contactMethod', 'none');
                                    updateFormData('contactValue', '');
                                    updateFormData('userName', '');
                                    updateFormData('userEmail', '');
                                }
                            }}
                        />
                        <div>
                            <span className="label-text font-medium">I&apos;d like updates on this feedback</span>
                            <div className="text-xs text-base-content/60">
                                Provide contact info if you want to be notified about progress
                            </div>
                        </div>
                    </label>
                </div>

                {/* Contact Information Fields */}
                {showContactFields && (
                    <div className="space-y-4 border border-base-300 rounded-xl p-4 bg-base-50">
                        <h4 className="text-sm font-medium text-base-content flex items-center gap-2">
                            <i className="fa-duotone fa-solid fa-address-card text-primary" />
                            Contact Information
                        </h4>

                        {/* Name */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Your Name</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full focus:input-primary transition-all duration-200"
                                placeholder="John Doe"
                                value={formData.userName || ''}
                                onChange={(e) => updateFormData('userName', e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        {/* Contact Method */}
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Preferred Contact Method</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {CONTACT_METHODS.map((method) => (
                                    <label
                                        key={method.value}
                                        className={`cursor-pointer border rounded-lg p-3 text-center transition-all duration-200 hover:border-primary/50 ${formData.contactMethod === method.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-base-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="contactMethod"
                                            value={method.value}
                                            checked={formData.contactMethod === method.value}
                                            onChange={(e) => updateFormData('contactMethod', e.target.value)}
                                            className="sr-only"
                                        />
                                        <div className="flex flex-col items-center gap-1">
                                            <i className={`fa-duotone fa-solid ${method.icon} ${formData.contactMethod === method.value ? 'text-primary' : 'text-base-content/40'
                                                }`} />
                                            <span className="text-xs font-medium">{method.label}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Contact Value */}
                        {formData.contactMethod && formData.contactMethod !== 'none' && (
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">
                                        {formData.contactMethod === 'email' ? 'Email Address' :
                                            formData.contactMethod === 'phone' ? 'Phone Number' : 'Slack Username'}
                                        <span className="text-error ml-1">*</span>
                                    </span>
                                </label>
                                <input
                                    type={formData.contactMethod === 'email' ? 'email' : 'text'}
                                    className={`input input-bordered w-full focus:input-primary transition-all duration-200 ${errors.contactValue ? 'input-error' : ''
                                        }`}
                                    placeholder={
                                        formData.contactMethod === 'email' ? 'your@email.com' :
                                            formData.contactMethod === 'phone' ? '+1 (555) 123-4567' : '@username'
                                    }
                                    value={formData.contactValue || ''}
                                    onChange={(e) => updateFormData('contactValue', e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                {errors.contactValue && (
                                    <label className="label">
                                        <span className="label-text-alt text-error">
                                            <i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" />
                                            {errors.contactValue}
                                        </span>
                                    </label>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary flex-1 sm:flex-none sm:min-w-[120px] transition-all duration-200 hover:scale-105"
                    >
                        {loading ? (
                            <>
                                <span className="loading loading-spinner loading-sm" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <i className="fa-duotone fa-solid fa-paper-plane" />
                                Submit Feedback
                            </>
                        )}
                    </button>

                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="btn  flex-1 sm:flex-none"
                        >
                            <i className="fa-duotone fa-solid fa-times" />
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

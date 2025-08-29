"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface FeedbackItem {
    id: string;
    type: 'bug' | 'feature_request' | 'improvement' | 'general' | 'ui_ux' | 'performance';
    category?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_review' | 'planned' | 'in_progress' | 'completed' | 'rejected' | 'duplicate';
    title: string;
    description: string;
    user_name?: string;
    user_email?: string;
    contact_method?: string;
    contact_value?: string;
    tags?: string[];
    escalated_at?: string;
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    site_domain?: string;
}

interface FeedbackTableProps {
    tenantId: string;
}

const FEEDBACK_TYPES = {
    bug: { label: 'Bug Report', icon: 'fa-bug', color: 'text-error' },
    feature_request: { label: 'Feature Request', icon: 'fa-lightbulb', color: 'text-warning' },
    improvement: { label: 'Improvement', icon: 'fa-arrow-up', color: 'text-info' },
    general: { label: 'General', icon: 'fa-message', color: 'text-base-content' },
    ui_ux: { label: 'UI/UX', icon: 'fa-paint-brush', color: 'text-secondary' },
    performance: { label: 'Performance', icon: 'fa-tachometer', color: 'text-primary' }
};

const PRIORITY_STYLES = {
    low: { badge: 'badge-ghost', text: 'text-base-content/60' },
    medium: { badge: 'badge-info', text: 'text-info' },
    high: { badge: 'badge-warning', text: 'text-warning' },
    urgent: { badge: 'badge-error', text: 'text-error' }
};

const STATUS_STYLES = {
    open: { badge: 'badge-info', text: 'text-info' },
    in_review: { badge: 'badge-warning', text: 'text-warning' },
    planned: { badge: 'badge-primary', text: 'text-primary' },
    in_progress: { badge: 'badge-secondary', text: 'text-secondary' },
    completed: { badge: 'badge-success', text: 'text-success' },
    rejected: { badge: 'badge-error', text: 'text-error' },
    duplicate: { badge: 'badge-ghost', text: 'text-base-content/60' }
};

export function FeedbackTable({ tenantId }: FeedbackTableProps) {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const typeFilter = searchParams.get('type') || '';
    const statusFilter = searchParams.get('status') || '';
    const priorityFilter = searchParams.get('priority') || '';
    const searchFilter = searchParams.get('search') || '';

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10'
            });
            
            if (typeFilter) params.append('type', typeFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (priorityFilter) params.append('priority', priorityFilter);
            if (searchFilter) params.append('search', searchFilter);

            const response = await fetch(`/api/feedback?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch feedback');
            }

            const data = await response.json();
            setFeedback(data.feedback || []);
            setTotal(data.pagination?.total || 0);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching feedback:', error);
            toast.error('Failed to load feedback');
        } finally {
            setLoading(false);
        }
    }, [page, typeFilter, statusFilter, priorityFilter, searchFilter]);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    const updateFeedbackStatus = async (id: string, status: string) => {
        try {
            const response = await fetch(`/api/feedback/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update feedback');
            }

            toast.success('Feedback updated successfully');
            fetchFeedback(); // Refresh the list
        } catch (error) {
            console.error('Error updating feedback:', error);
            toast.error('Failed to update feedback');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 7) return formatDate(dateString);
        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        if (diffMinutes > 0) return `${diffMinutes}m ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-base-200/60 rounded animate-pulse"></div>
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-16 bg-base-200/40 rounded animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (feedback.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-duotone fa-solid fa-comments text-2xl text-base-content/40" />
                </div>
                <h3 className="text-lg font-medium text-base-content mb-2">No feedback yet</h3>
                <p className="text-base-content/60 mb-4">
                    {typeFilter || statusFilter || priorityFilter || searchFilter
                        ? 'No feedback matches your current filters.'
                        : 'Feedback from your widget users will appear here.'}
                </p>
                {(typeFilter || statusFilter || priorityFilter || searchFilter) && (
                    <button
                        onClick={() => router.push('/dashboard/feedback')}
                        className="btn btn-ghost btn-sm"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Feedback List */}
            <div className="space-y-3">
                {feedback.map((item) => {
                    const typeInfo = FEEDBACK_TYPES[item.type];
                    const priorityStyle = PRIORITY_STYLES[item.priority];
                    const statusStyle = STATUS_STYLES[item.status];

                    return (
                        <div
                            key={item.id}
                            className="border border-base-300 rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
                            onClick={() => setSelectedItem(item)}
                        >
                            <div className="flex items-start gap-4">
                                {/* Type Icon */}
                                <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                                    <i className={`fa-duotone fa-solid ${typeInfo.icon} ${typeInfo.color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-base-content truncate mb-1">
                                                {item.title}
                                            </h4>
                                            <p className="text-sm text-base-content/70 line-clamp-2 mb-2">
                                                {item.description}
                                            </p>
                                            
                                            {/* Metadata */}
                                            <div className="flex items-center gap-4 text-xs text-base-content/60">
                                                <span>{getTimeAgo(item.created_at)}</span>
                                                {item.user_name && (
                                                    <span className="flex items-center gap-1">
                                                        <i className="fa-duotone fa-solid fa-user" />
                                                        {item.user_name}
                                                    </span>
                                                )}
                                                {item.site_domain && (
                                                    <span className="flex items-center gap-1">
                                                        <i className="fa-duotone fa-solid fa-globe" />
                                                        {item.site_domain}
                                                    </span>
                                                )}
                                                {item.escalated_at && (
                                                    <span className="flex items-center gap-1 text-warning">
                                                        <i className="fa-duotone fa-solid fa-bolt" />
                                                        Escalated
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status and Priority */}
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <div className={`badge badge-sm ${priorityStyle.badge}`}>
                                                    {item.priority}
                                                </div>
                                                <div className={`badge badge-sm ${statusStyle.badge}`}>
                                                    {item.status.replace('_', ' ')}
                                                </div>
                                            </div>
                                            
                                            {/* Quick actions */}
                                            <div className="flex items-center gap-1">
                                                {item.status === 'open' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateFeedbackStatus(item.id, 'in_review');
                                                        }}
                                                        className="btn btn-xs btn-ghost"
                                                        title="Mark as in review"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-eye" />
                                                    </button>
                                                )}
                                                
                                                {(item.status === 'in_review' || item.status === 'in_progress') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateFeedbackStatus(item.id, 'completed');
                                                        }}
                                                        className="btn btn-xs btn-success"
                                                        title="Mark as completed"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-check" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="flex items-center gap-1 mt-2">
                                            {item.tags.slice(0, 3).map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="badge badge-outline badge-xs"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {item.tags.length > 3 && (
                                                <span className="text-xs text-base-content/60">
                                                    +{item.tags.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-base-content/60">
                        Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, total)} of {total} items
                    </div>
                    
                    <div className="join">
                        <button
                            className="join-item btn btn-sm"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <i className="fa-duotone fa-solid fa-chevron-left" />
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                            if (pageNum > totalPages) return null;
                            
                            return (
                                <button
                                    key={pageNum}
                                    className={`join-item btn btn-sm ${pageNum === page ? 'btn-active' : ''}`}
                                    onClick={() => setPage(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        <button
                            className="join-item btn btn-sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            <i className="fa-duotone fa-solid fa-chevron-right" />
                        </button>
                    </div>
                </div>
            )}

            {/* Feedback Detail Modal */}
            {selectedItem && (
                <FeedbackDetailModal
                    feedback={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onUpdate={fetchFeedback}
                />
            )}
        </div>
    );
}

interface FeedbackDetailModalProps {
    feedback: FeedbackItem;
    onClose: () => void;
    onUpdate: () => void;
}

function FeedbackDetailModal({ feedback, onClose, onUpdate }: FeedbackDetailModalProps) {
    const [updating, setUpdating] = useState(false);

    const updateStatus = async (status: string) => {
        setUpdating(true);
        try {
            const response = await fetch(`/api/feedback/${feedback.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error('Failed to update feedback');
            }

            toast.success('Status updated successfully');
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating feedback:', error);
            toast.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const typeInfo = FEEDBACK_TYPES[feedback.type];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-base-100 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-base-300">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center">
                                <i className={`fa-duotone fa-solid ${typeInfo.icon} text-lg ${typeInfo.color}`} />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-base-content mb-1">
                                    {feedback.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className={`badge badge-sm ${PRIORITY_STYLES[feedback.priority].badge}`}>
                                        {feedback.priority}
                                    </span>
                                    <span className={`badge badge-sm ${STATUS_STYLES[feedback.status].badge}`}>
                                        {feedback.status.replace('_', ' ')}
                                    </span>
                                    <span className="badge badge-ghost badge-sm">
                                        {typeInfo.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="btn btn-ghost btn-sm btn-circle"
                        >
                            <i className="fa-duotone fa-solid fa-times" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-6">
                        {/* Description */}
                        <div>
                            <h4 className="font-medium text-base-content mb-2">Description</h4>
                            <p className="text-base-content/80 whitespace-pre-wrap">
                                {feedback.description}
                            </p>
                        </div>

                        {/* Contact Info */}
                        {(feedback.user_name || feedback.user_email) && (
                            <div>
                                <h4 className="font-medium text-base-content mb-2">Contact Information</h4>
                                <div className="bg-base-200/50 rounded-lg p-3 space-y-1">
                                    {feedback.user_name && (
                                        <p className="text-sm">
                                            <span className="font-medium">Name:</span> {feedback.user_name}
                                        </p>
                                    )}
                                    {feedback.user_email && (
                                        <p className="text-sm">
                                            <span className="font-medium">Email:</span> 
                                            <a 
                                                href={`mailto:${feedback.user_email}`}
                                                className="text-primary hover:underline ml-1"
                                            >
                                                {feedback.user_email}
                                            </a>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div>
                            <h4 className="font-medium text-base-content mb-2">Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-base-content/60">Created:</span>
                                    <br />
                                    <span>{new Date(feedback.created_at).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-base-content/60">Last Updated:</span>
                                    <br />
                                    <span>{new Date(feedback.updated_at).toLocaleString()}</span>
                                </div>
                                {feedback.site_domain && (
                                    <div>
                                        <span className="text-base-content/60">Site:</span>
                                        <br />
                                        <span>{feedback.site_domain}</span>
                                    </div>
                                )}
                                {feedback.escalated_at && (
                                    <div>
                                        <span className="text-base-content/60">Escalated:</span>
                                        <br />
                                        <span>{new Date(feedback.escalated_at).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        {feedback.tags && feedback.tags.length > 0 && (
                            <div>
                                <h4 className="font-medium text-base-content mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {feedback.tags.map((tag, index) => (
                                        <span key={index} className="badge badge-outline">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-base-300">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/60">
                            ID: {feedback.id.slice(-8)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <select
                                className="select select-bordered select-sm"
                                value={feedback.status}
                                onChange={(e) => updateStatus(e.target.value)}
                                disabled={updating}
                            >
                                <option value="open">Open</option>
                                <option value="in_review">In Review</option>
                                <option value="planned">Planned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                                <option value="duplicate">Duplicate</option>
                            </select>
                            
                            <button
                                onClick={onClose}
                                className="btn btn-ghost btn-sm"
                                disabled={updating}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

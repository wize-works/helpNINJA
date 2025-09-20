"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { HoverScale } from './ui/animated-page';
import { toast } from '@/lib/toast';
import StatCard from './ui/stat-card';

type OutboxItem = {
    id: string;
    provider: string;
    integration_name?: string;
    integration_provider?: string;
    rule_name?: string;
    session_id?: string;
    status: 'pending' | 'sent' | 'failed';
    attempts: number;
    payload: Record<string, unknown>;
    last_error?: string;
    created_at: string;
    sent_at?: string;
    next_attempt_at?: string;
    message_context: Record<string, unknown>;
};

type OutboxStats = Record<string, Record<string, number>>;

export default function OutboxTable() {
    const [items, setItems] = useState<OutboxItem[]>([]);
    const [stats, setStats] = useState<OutboxStats>({});
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<Set<string>>(new Set());
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [pagination, setPagination] = useState({
        limit: 50,
        offset: 0,
        hasMore: false
    });

    const searchParams = useSearchParams();

    const statusFilter = searchParams.get('status') || '';
    const providerFilter = searchParams.get('provider') || '';
    const ruleIdFilter = searchParams.get('ruleId') || '';
    const searchFilter = searchParams.get('search') || '';

    const loadOutboxItems = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                limit: pagination.limit.toString(),
                offset: pagination.offset.toString()
            });

            if (statusFilter) params.set('status', statusFilter);
            if (providerFilter) params.set('provider', providerFilter);
            if (ruleIdFilter) params.set('ruleId', ruleIdFilter);
            if (searchFilter) params.set('search', searchFilter);

            const response = await fetch(`/api/outbox?${params}`);

            if (response.ok) {
                const data = await response.json();
                setItems(data.items);
                setStats(data.stats);
                setPagination(prev => ({
                    ...prev,
                    hasMore: data.pagination.hasMore
                }));
            }
        } catch (error) {
            console.error('Error loading outbox items:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, providerFilter, ruleIdFilter, searchFilter, pagination.limit, pagination.offset]);

    useEffect(() => {
        loadOutboxItems();
    }, [loadOutboxItems]);

    const retryItems = async (itemIds: string[]) => {
        if (itemIds.length === 0) return;

        setRetrying(prev => {
            const newSet = new Set(prev);
            itemIds.forEach(id => newSet.add(id));
            return newSet;
        });

        try {
            const response = await fetch('/api/outbox/retry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itemIds })
            });

            if (response.ok) {
                const result = await response.json();
                toast.success({ message: `Retry completed: ${result.retried} successful, ${result.failed} failed` });
                loadOutboxItems();
                setSelectedItems(new Set());
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to retry items');
            }
        } catch (error) {
            console.error('Error retrying items:', error);
            toast.error({ message: 'Failed to retry items' });
        } finally {
            setRetrying(prev => {
                const newSet = new Set(prev);
                itemIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
    };

    const retryAll = async () => {
        if (!confirm('Retry all failed items? This may take a while.')) return;

        setRetrying(prev => new Set([...prev, 'all']));

        try {
            const response = await fetch('/api/outbox/retry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ retryAll: true })
            });

            if (response.ok) {
                const result = await response.json();
                toast.success({ message: `Retry completed: ${result.retried} successful, ${result.failed} failed` });
                loadOutboxItems();
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to retry all items');
            }
        } catch (error) {
            console.error('Error retrying all items:', error);
            toast.error({ message: 'Failed to retry all items' });
        } finally {
            setRetrying(prev => {
                const newSet = new Set(prev);
                newSet.delete('all');
                return newSet;
            });
        }
    };

    const toggleItemSelection = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const toggleAllSelection = () => {
        const failedItems = items.filter(item => item.status === 'failed').map(item => item.id);
        setSelectedItems(prev =>
            prev.size === failedItems.length ? new Set() : new Set(failedItems)
        );
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent': return 'fa-check-circle text-success';
            case 'pending': return 'fa-clock text-warning';
            case 'failed': return 'fa-exclamation-circle text-error';
            default: return 'fa-question-circle text-base-content/60';
        }
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'slack': return 'fa-slack';
            case 'email': return 'fa-envelope';
            case 'teams': return 'fa-microsoft';
            default: return 'fa-paper-plane';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="animate-pulse bg-base-300/60 h-16 rounded-xl"></div>
                ))}
            </div>
        );
    }

    const failedCount = Object.values(stats.failed || {}).reduce((sum, count) => sum + count, 0);
    const pendingCount = Object.values(stats.pending || {}).reduce((sum, count) => sum + count, 0);
    const sentCount = Object.values(stats.sent || {}).reduce((sum, count) => sum + count, 0);

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Sent"
                    value={sentCount}
                    description="Successfully delivered"
                    color='success'
                    icon='fa-check-circle'
                />
                <StatCard
                    title="Pending"
                    value={pendingCount}
                    description="Waiting to send"
                    color='warning'
                    icon='fa-clock'
                />
                <StatCard
                    title="Failed"
                    value={failedCount}
                    description="Need attention"
                    color='error'
                    icon='fa-exclamation-circle'
                />
                <StatCard
                    title="Total"
                    value={items.length}
                    description="Total delivery attempts"
                    color='info'
                    icon='fa-inbox'
                />
            </div>

            {/* Actions */}
            <div className="card bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-base-content">Bulk Actions</h3>
                            <p className="text-sm text-base-content/60">
                                Select failed items to retry delivery attempts
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {selectedItems.size > 0 && (
                                <HoverScale scale={1.02}>
                                    <button
                                        className={`btn btn-primary rounded-xl ${retrying.size > 0 ? 'loading' : ''}`}
                                        onClick={() => retryItems(Array.from(selectedItems))}
                                        disabled={retrying.size > 0}
                                    >
                                        <i className="fa-duotone fa-solid fa-retry mr-2" aria-hidden />
                                        Retry Selected ({selectedItems.size})
                                    </button>
                                </HoverScale>
                            )}

                            {failedCount > 0 && (
                                <HoverScale scale={1.02}>
                                    <button
                                        className={`btn btn-outline rounded-xl ${retrying.has('all') ? 'loading' : ''}`}
                                        onClick={retryAll}
                                        disabled={retrying.size > 0}
                                    >
                                        <i className="fa-duotone fa-solid fa-refresh mr-2" aria-hidden />
                                        Retry All Failed
                                    </button>
                                </HoverScale>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="card bg-base-100 shadow-xl rounded-2xl">
                <div className="card-body p-0">
                    {items.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-base-200/60 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <i className="fa-duotone fa-solid fa-inbox text-2xl text-base-content/40" aria-hidden />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No delivery attempts found</h3>
                            <p className="text-base-content/60">
                                {statusFilter || providerFilter || ruleIdFilter || searchFilter
                                    ? 'No items match your current filters'
                                    : 'No escalations have been triggered yet'
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Table Header */}
                            <div className="bg-base-200/40 border-b border-base-300 p-4">
                                <div className="flex items-center gap-4">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={selectedItems.size > 0 && selectedItems.size === items.filter(item => item.status === 'failed').length}
                                        onChange={toggleAllSelection}
                                    />
                                    <span className="text-sm font-medium text-base-content/80">
                                        Select all failed items
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            <div className="divide-y divide-base-200">
                                {items.map((item) => (
                                    <div key={item.id} className="p-4 hover:bg-base-200/40 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary mt-1"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => toggleItemSelection(item.id)}
                                                disabled={item.status !== 'failed'}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <i className={`fa-duotone fa-solid ${getStatusIcon(item.status)}`} aria-hidden />
                                                    <i className={`fa-duotone fa-solid ${getProviderIcon(item.provider)} text-base-content/60`} aria-hidden />

                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm">
                                                            {item.integration_name || `${item.provider} delivery`}
                                                        </div>
                                                        <div className="text-xs text-base-content/60">
                                                            {item.rule_name && `Rule: ${item.rule_name} • `}
                                                            Created: {formatDate(item.created_at)}
                                                            {item.sent_at && ` • Sent: ${formatDate(item.sent_at)}`}
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className={`badge ${item.status === 'sent' ? 'badge-success' :
                                                            item.status === 'pending' ? 'badge-warning' : 'badge-error'
                                                            }`}>
                                                            {item.status}
                                                        </div>
                                                        {item.attempts > 0 && (
                                                            <div className="text-xs text-base-content/60 mt-1">
                                                                {item.attempts} attempt{item.attempts > 1 ? 's' : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {item.last_error && (
                                                    <div className="bg-error/10 border border-error/20 rounded-lg p-3 mt-2">
                                                        <div className="text-xs font-medium text-error mb-1">Error:</div>
                                                        <div className="text-xs text-error/80 font-mono">
                                                            {item.last_error}
                                                        </div>
                                                    </div>
                                                )}

                                                {item.status === 'failed' && (
                                                    <div className="flex gap-2 mt-3">
                                                        <button
                                                            className={`btn btn-xs btn-primary rounded-lg ${retrying.has(item.id) ? 'loading' : ''}`}
                                                            onClick={() => retryItems([item.id])}
                                                            disabled={retrying.has(item.id)}
                                                        >
                                                            Retry
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {pagination.hasMore && (
                                <div className="p-4 border-t border-base-300 text-center">
                                    <button
                                        className="btn btn-outline rounded-xl"
                                        onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                                    >
                                        Load More
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

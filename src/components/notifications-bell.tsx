"use client";

import React from 'react';

type NotificationItem = {
    id: string;
    type: string;
    severity: string;
    title: string;
    body: string | null;
    created_at: string;
    read_at?: string | null;
    meta?: Record<string, unknown>;
};

function severityIcon(sev: string) {
    switch (sev) {
        case 'success': return { icon: 'fa-circle-check', cls: 'text-success' };
        case 'warning': return { icon: 'fa-triangle-exclamation', cls: 'text-warning' };
        case 'error': return { icon: 'fa-circle-xmark', cls: 'text-error' };
        case 'critical': return { icon: 'fa-radiation', cls: 'text-error' };
        default: return { icon: 'fa-circle-info', cls: 'text-info' };
    }
}

function timeAgo(iso: string) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
}

export default function NotificationsBell() {
    const [open, setOpen] = React.useState(false);
    const [unread, setUnread] = React.useState<number>(0);
    const [loading, setLoading] = React.useState(false);
    const [items, setItems] = React.useState<NotificationItem[]>([]);
    const [nextCursor, setNextCursor] = React.useState<string | null>(null);
    const [initialLoaded, setInitialLoaded] = React.useState(false);
    const panelRef = React.useRef<HTMLDivElement | null>(null);

    // Poll unread count (adaptive)
    const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const lastFetchRef = React.useRef<number>(0);

    const fetchUnread = React.useCallback(async () => {
        try {
            const now = Date.now();
            // Throttle if calls happen too rapidly (< 1s apart)
            if (now - lastFetchRef.current < 750) return;
            lastFetchRef.current = now;
            const r = await fetch('/api/notifications/unread-count', {
                cache: 'no-store',
                redirect: 'manual',
                headers: { Accept: 'application/json' },
            });
            if (r.type === 'opaqueredirect' || r.status === 401) {
                const signIn = (process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/signin');
                const redirectUrl = encodeURIComponent(window.location.href);
                window.location.href = `${signIn}?redirect_url=${redirectUrl}`;
                return;
            }
            if (!r.ok) return;
            const j = await r.json();
            setUnread(j.count || 0);
        } catch { /* ignore */ }
    }, []);

    const startPolling = React.useCallback((interval: number) => {
        if (pollRef.current) clearInterval(pollRef.current!);
        pollRef.current = setInterval(fetchUnread, interval);
    }, [fetchUnread]);

    React.useEffect(() => {
        // Base poll every 25s when closed, faster (6s) when open
        fetchUnread();
        startPolling(open ? 6000 : 25000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [open, fetchUnread, startPolling]);

    // Refresh on window focus / visibility regain
    React.useEffect(() => {
        function onFocus() { fetchUnread(); }
        function onVisible() { if (document.visibilityState === 'visible') fetchUnread(); }
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
    }, [fetchUnread]);

    // Close on outside click
    React.useEffect(() => {
        function handler(e: MouseEvent) {
            if (!open) return;
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    async function loadNotifications(reset = false) {
        if (loading) return;
        setLoading(true);
        try {
            const cursor = reset ? undefined : nextCursor || undefined;
            const url = new URL('/api/notifications', window.location.origin);
            if (cursor) url.searchParams.set('cursor', cursor);
            const r = await fetch(url.toString(), {
                cache: 'no-store',
                redirect: 'manual',
                headers: { Accept: 'application/json' },
            });
            if (r.type === 'opaqueredirect' || r.status === 401) {
                const signIn = (process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/signin');
                const redirectUrl = encodeURIComponent(window.location.href);
                window.location.href = `${signIn}?redirect_url=${redirectUrl}`;
                return;
            }
            if (r.ok) {
                const j = await r.json();
                setItems(prev => reset ? j.notifications : [...prev, ...j.notifications]);
                setNextCursor(j.nextCursor || null);
                setInitialLoaded(true);
            }
        } finally {
            setLoading(false);
        }
    }

    function toggle() {
        setOpen(o => {
            const n = !o;
            if (n && !initialLoaded) {
                void loadNotifications(true);
            }
            return n;
        });
    }

    async function markRead(id: string) {
        try {
            const r = await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                redirect: 'manual',
                headers: { Accept: 'application/json' },
            });
            if (r.type === 'opaqueredirect' || r.status === 401) {
                const signIn = (process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/signin');
                const redirectUrl = encodeURIComponent(window.location.href);
                window.location.href = `${signIn}?redirect_url=${redirectUrl}`;
                return;
            }
            if (r.ok) {
                setItems(prev => prev.map(it => it.id === id ? { ...it, read_at: new Date().toISOString() } : it));
                setUnread(u => Math.max(0, u - 1));
            }
        } catch { }
    }

    async function markAll() {
        try {
            const r = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                redirect: 'manual',
                headers: { Accept: 'application/json' },
            });
            if (r.type === 'opaqueredirect' || r.status === 401) {
                const signIn = (process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/auth/signin');
                const redirectUrl = encodeURIComponent(window.location.href);
                window.location.href = `${signIn}?redirect_url=${redirectUrl}`;
                return;
            }
            if (r.ok) {
                setItems(prev => prev.map(it => ({ ...it, read_at: it.read_at || new Date().toISOString() })));
                setUnread(0);
            }
        } catch { }
    }

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={toggle}
                className="relative w-9 h-9 rounded-lg bg-base-200/60 hover:bg-base-200 border border-base-300/40 flex items-center justify-center transition-all duration-200 group"
                aria-label="Notifications"
                title="Notifications"
            >
                <i className="fa-duotone fa-solid fa-bell text-sm text-base-content/70 group-hover:text-base-content" aria-hidden />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-error rounded-full border border-base-100 flex items-center justify-center text-[10px] font-semibold text-error-content">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 mt-3 w-96 max-w-[90vw] bg-base-100/95 backdrop-blur-sm border border-base-300/40 rounded-2xl shadow-xl p-0 overflow-hidden z-[60] animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-base-300/40 bg-base-200/40">
                        <div className="flex items-center gap-2">
                            <i className="fa-duotone fa-solid fa-bell text-base-content/70" />
                            <h3 className="text-sm font-semibold">Notifications</h3>
                            {unread > 0 && <span className="badge badge-error badge-xs">{unread}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => { void loadNotifications(true); void fetchUnread(); }} className="btn btn-ghost btn-xs rounded-lg" title="Refresh" aria-label="Refresh notifications">
                                <i className="fa-duotone fa-solid fa-rotate" />
                            </button>
                            <button onClick={markAll} disabled={unread === 0} className="btn btn-ghost btn-xs rounded-lg disabled:opacity-40" aria-disabled={unread === 0}>Mark all read</button>
                        </div>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto thin-scrollbar">
                        {items.length === 0 && !loading && (
                            <div className="p-8 text-center text-sm text-base-content/60">No notifications yet</div>
                        )}
                        <ul className="divide-y divide-base-200/60">
                            {items.map(n => {
                                const sev = severityIcon(n.severity);
                                return (
                                    <li key={n.id} className={`p-4 hover:bg-base-200/40 transition-all group ${!n.read_at ? 'bg-base-200/20' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-9 h-9 rounded-xl bg-base-200/60 flex items-center justify-center shadow-inner ${!n.read_at ? 'ring-2 ring-primary/30' : ''}`}>
                                                <i className={`fa-duotone fa-solid ${sev.icon} ${sev.cls} text-sm`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-medium text-base-content truncate pr-2">{n.title}</h4>
                                                    <span className="text-[10px] font-medium text-base-content/50 tabular-nums">{timeAgo(n.created_at)}</span>
                                                </div>
                                                {n.body && <p className="text-xs text-base-content/60 mt-1 leading-snug whitespace-pre-line">{n.body}</p>}
                                                <div className="mt-2 flex items-center gap-2">
                                                    {!n.read_at && (
                                                        <button onClick={() => markRead(n.id)} className="btn btn-ghost btn-xs rounded-md h-6 px-2 text-[11px]" aria-label="Mark read">
                                                            Mark read
                                                        </button>
                                                    )}
                                                    {/* Future: deep link action */}
                                                    {n.meta && typeof (n.meta as Record<string, unknown>).conversationId === 'string' && (
                                                        <a href={`/dashboard/conversations/${(n.meta as Record<string, unknown>).conversationId as string}`} className="btn btn-ghost btn-xs rounded-md h-6 px-2 text-[11px]" aria-label="Open conversation">
                                                            Open
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                            {loading && (
                                <li className="p-4 text-center text-xs text-base-content/50">Loading…</li>
                            )}
                        </ul>
                        {nextCursor && !loading && (
                            <div className="p-3 border-t border-base-300/40 text-center">
                                <button onClick={() => loadNotifications(false)} className="btn btn-ghost btn-sm rounded-lg w-full" aria-label="Load more notifications">Load more</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

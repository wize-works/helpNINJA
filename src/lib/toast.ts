import { toast as reactToast } from 'react-hot-toast';
import React from 'react';

const neutralToastOptions = {
    className: 'bg-transparent shadow-none p-0',
    style: {
        background: 'transparent',
        boxShadow: 'none',
        padding: 0,
        color: 'inherit'
    } as React.CSSProperties
};

function alertContent(variant: 'success' | 'error' | 'info' | 'warning', message: string, iconClass: string) {
    const cls =
        variant === 'success' ? 'alert alert-success' :
            variant === 'error' ? 'alert alert-error' :
                variant === 'warning' ? 'alert alert-warning' :
                    'alert alert-info';
    return React.createElement(
        'div',
        { className: cls },
        React.createElement('i', { className: `${iconClass} mr-2` }),
        React.createElement('span', null, message)
    );
}

/**
 * Centralized toast utilities for consistent notifications across the app
 */
export const toast = {
    /**
     * Show a success toast
     */
    success: ({ message, id, duration }: { message: string; id?: string; duration?: number }) => {
        reactToast.success(
            alertContent('success', message, 'fa-solid fa-duotone fa-badge-check'),
            { id, duration, ...neutralToastOptions }
        );
    },

    /**
     * Show an error toast
     */
    error: ({ message, id, duration }: { message: string; id?: string; duration?: number }) => {
        reactToast.error(
            alertContent('error', message, 'fa-solid fa-duotone fa-hexagon-exclamation'),
            { id, duration, ...neutralToastOptions }
        );
    },

    /**
     * Show a loading toast and return the toast ID for updates
     */
    loading: ({ message, id, duration }: { message: string; id?: string; duration?: number }) => {
        return reactToast.loading(
            alertContent('info', message, 'fa-solid fa-duotone fa-spinner fa-spin'),
            { id, duration, icon: React.createElement('span', { className: 'hidden' }), ...neutralToastOptions }
        );
    },

    /**
     * Update an existing toast (useful for loading states)
     */
    update: ({ id, message, type, duration }: { id: string, message: string, type: 'success' | 'error', duration?: number }) => {
        if (type === 'success') {
            reactToast.success(
                alertContent('success', message, 'fa-solid fa-duotone fa-badge-check'),
                { id, duration, ...neutralToastOptions }
            );
        } else {
            reactToast.error(
                alertContent('error', message, 'fa-solid fa-duotone fa-hexagon-exclamation'),
                { id, duration, ...neutralToastOptions }
            );
        }
    },

    /**
     * Show a info toast
     */
    info: ({ message, id, duration }: { message: string; id?: string; duration?: number }) => {
        reactToast(
            alertContent('info', message, 'fa-solid fa-duotone fa-circle-info'),
            { id, duration, ...neutralToastOptions }
        );
    },

    /**
     * Show a copy to clipboard success toast
     */
    copied: ({ item, id, duration }: { item: string, id?: string, duration?: number }) => {
        reactToast.success(
            alertContent('success', `${item} copied to clipboard!`, 'fa-solid fa-duotone fa-badge-check'),
            { id, duration, ...neutralToastOptions }
        );
    },

    /**
     * Handle API error responses consistently
     */
    apiError: (error: { error?: string; message?: string } | unknown, fallbackMessage: string, duration?: number) => {
        const errorObj = error as { error?: string; message?: string };
        const message = errorObj?.error || errorObj?.message || fallbackMessage;
        reactToast.error(
            alertContent('error', message, 'fa-solid fa-duotone fa-hexagon-exclamation'),
            { duration, ...neutralToastOptions }
        );
    },

    /**
     * Show a validation error toast
     */
    validation: ({ message, id, duration }: { message: string, id?: string, duration?: number }) => {
        reactToast.error(
            alertContent('warning', message, 'fa-solid fa-duotone fa-triangle-exclamation'),
            { id, duration, ...neutralToastOptions }
        );
    },
};

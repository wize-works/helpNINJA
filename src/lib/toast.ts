import toast from 'react-hot-toast';

/**
 * Centralized toast utilities for consistent notifications across the app
 */
export const toastUtils = {
    /**
     * Show a success toast
     */
    success: (message: string) => {
        toast.success(message);
    },

    /**
     * Show an error toast
     */
    error: (message: string) => {
        toast.error(message);
    },

    /**
     * Show a loading toast and return the toast ID for updates
     */
    loading: (message: string) => {
        return toast.loading(message);
    },

    /**
     * Update an existing toast (useful for loading states)
     */
    update: (toastId: string, message: string, type: 'success' | 'error') => {
        if (type === 'success') {
            toast.success(message, { id: toastId });
        } else {
            toast.error(message, { id: toastId });
        }
    },

    /**
     * Show a info toast
     */
    info: (message: string) => {
        toast(message, {
            icon: 'ℹ️',
        });
    },

    /**
     * Show a copy to clipboard success toast
     */
    copied: (item = 'Item') => {
        toast.success(`${item} copied to clipboard!`, {
            icon: '📋',
        });
    },

    /**
     * Handle API error responses consistently
     */
    apiError: (error: { error?: string; message?: string } | unknown, fallbackMessage: string) => {
        const errorObj = error as { error?: string; message?: string };
        const message = errorObj?.error || errorObj?.message || fallbackMessage;
        toast.error(message);
    },

    /**
     * Show a validation error toast
     */
    validation: (message: string) => {
        toast.error(message, {
            icon: '⚠️',
        });
    },
};

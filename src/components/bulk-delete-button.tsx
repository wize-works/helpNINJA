"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { HoverScale } from "@/components/ui/animated-page";

interface BulkDeleteButtonProps {
    selectedIds: string[];
    onDeleteComplete: () => void;
}

export default function BulkDeleteButton({ selectedIds, onDeleteComplete }: BulkDeleteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        if (isDeleting || selectedIds.length === 0) return;

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/documents/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    documentIds: selectedIds
                }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(`${result.deletedCount} document${result.deletedCount === 1 ? '' : 's'} deleted successfully!`);
                onDeleteComplete();
                // Don't need router.refresh() since we're handling the refresh through the callback
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to delete documents");
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    const handleCancel = () => {
        setShowConfirm(false);
    };

    if (selectedIds.length === 0) {
        return null;
    }

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-base-content/70">
                    Delete {selectedIds.length} document{selectedIds.length === 1 ? '' : 's'}?
                </span>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="btn btn-error btn-sm rounded-lg"
                >
                    {isDeleting ? (
                        <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                        <>
                            <i className="fa-duotone fa-solid fa-check mr-2" aria-hidden />
                            Delete {selectedIds.length}
                        </>
                    )}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={isDeleting}
                    className="btn btn-ghost btn-sm rounded-lg"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <HoverScale scale={1.02}>
            <button
                onClick={() => setShowConfirm(true)}
                className="btn btn-error btn-sm rounded-lg"
            >
                <i className="fa-duotone fa-solid fa-trash mr-2" aria-hidden />
                Delete {selectedIds.length} Selected
            </button>
        </HoverScale>
    );
}

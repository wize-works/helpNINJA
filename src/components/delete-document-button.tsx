"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { HoverScale } from "@/components/ui/animated-page";

interface DeleteDocumentButtonProps {
    id: string;
    size?: "sm" | "md";
    onDeleteComplete?: () => void;
}

export default function DeleteDocumentButton({ id, size = "md", onDeleteComplete }: DeleteDocumentButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (isDeleting) return;

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success({ message: "Document deleted successfully!" });
                // Call the callback if provided, otherwise fallback to router refresh
                if (onDeleteComplete) {
                    onDeleteComplete();
                } else {
                    router.refresh();
                }
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to delete document");
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error({ message: "Something went wrong. Please try again." });
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    const handleCancel = () => {
        setShowConfirm(false);
    };

    if (showConfirm) {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="btn btn-error btn-xs rounded-lg"
                    title="Confirm delete"
                >
                    {isDeleting ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <>
                            <i className="fa-duotone fa-solid fa-check text-xs" aria-hidden />
                            Delete
                        </>
                    )}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={isDeleting}
                    className="btn btn-ghost btn-xs rounded-lg"
                    title="Cancel"
                >
                    <i className="fa-duotone fa-solid fa-times text-xs" aria-hidden />
                </button>
            </div>
        );
    }

    return (
        <HoverScale scale={1.05}>
            <button
                onClick={() => setShowConfirm(true)}
                className={`${size === "sm" ? "w-9 h-9" : "w-10 h-10"} rounded-lg bg-error/10 hover:bg-error/20 border border-error/20 hover:border-error/30 text-error hover:text-error/80 flex items-center justify-center transition-all duration-200 group`}
                aria-label="Delete document"
                title="Delete document"
            >
                <i className={`fa-duotone fa-solid fa-trash ${size === "sm" ? "text-sm" : "text-base"} group-hover:scale-110 transition-transform`} aria-hidden />
            </button>
        </HoverScale>
    );
}

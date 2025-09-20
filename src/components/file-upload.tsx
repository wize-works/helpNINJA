"use client";

import { useState, useRef, useCallback } from 'react';
import { toast } from '@/lib/toast';
import Image from 'next/image';

export interface FileUploadItem {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    preview?: string;
    uploading?: boolean;
    uploaded?: boolean;
    error?: string;
}

interface FileUploadProps {
    accept?: string;
    maxFiles?: number;
    maxFileSize?: number; // in bytes
    onFilesChange?: (files: FileUploadItem[]) => void;
    disabled?: boolean;
    className?: string;
    compact?: boolean; // For widget mode
}

const DEFAULT_ACCEPT = 'image/*,.pdf,.doc,.docx,.txt,.log';
const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUpload({
    accept = DEFAULT_ACCEPT,
    maxFiles = DEFAULT_MAX_FILES,
    maxFileSize = DEFAULT_MAX_SIZE,
    onFilesChange,
    disabled = false,
    className = '',
    compact = false
}: FileUploadProps) {
    const [files, setFiles] = useState<FileUploadItem[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateFiles = useCallback((newFiles: FileUploadItem[]) => {
        setFiles(newFiles);
        onFilesChange?.(newFiles);
    }, [onFilesChange]);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const validateFile = (file: File): string | null => {
        // Check file size
        if (file.size > maxFileSize) {
            return `File size (${formatFileSize(file.size)}) exceeds limit (${formatFileSize(maxFileSize)})`;
        }

        // Check file type
        const acceptedTypes = accept.split(',').map(type => type.trim());
        const isAccepted = acceptedTypes.some(acceptedType => {
            if (acceptedType.startsWith('.')) {
                return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
            }
            if (acceptedType.includes('*')) {
                const [mainType] = acceptedType.split('/');
                return file.type.startsWith(mainType);
            }
            return file.type === acceptedType;
        });

        if (!isAccepted) {
            return `File type not supported. Accepted types: ${accept}`;
        }

        return null;
    };

    const createPreview = (file: File): Promise<string | undefined> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = () => resolve(undefined);
                reader.readAsDataURL(file);
            } else {
                resolve(undefined);
            }
        });
    };

    const addFiles = async (newFiles: File[]) => {
        if (disabled) return;

        const currentCount = files.length;
        const availableSlots = maxFiles - currentCount;

        if (newFiles.length > availableSlots) {
            toast.error({ message: `Can only add ${availableSlots} more file(s). Maximum ${maxFiles} files allowed.` });
            newFiles = newFiles.slice(0, availableSlots);
        }

        const processedFiles: FileUploadItem[] = [];

        for (const file of newFiles) {
            const error = validateFile(file);
            if (error) {
                toast.error({ message: `${file.name}: ${error}` });
                continue;
            }

            // Check for duplicates
            if (files.some(f => f.name === file.name && f.size === file.size)) {
                toast.error({ message: `File ${file.name} is already added` });
                continue;
            }

            const preview = await createPreview(file);
            const fileItem: FileUploadItem = {
                id: `${file.name}-${file.size}-${Date.now()}`,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                preview,
                uploading: false,
                uploaded: false
            };

            processedFiles.push(fileItem);
        }

        if (processedFiles.length > 0) {
            updateFiles([...files, ...processedFiles]);
            toast.success({ message: `Added ${processedFiles.length} file(s)` });
        }
    };

    const removeFile = (id: string) => {
        if (disabled) return;
        const newFiles = files.filter(f => f.id !== id);
        updateFiles(newFiles);
        toast.success({ message: 'File removed' });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            addFiles(selectedFiles);
        }
        // Reset input value to allow re-selecting the same file
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) {
            setDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            addFiles(droppedFiles);
        }
    };

    const getFileIcon = (file: FileUploadItem): string => {
        if (file.type.startsWith('image/')) return 'fa-image';
        if (file.type.includes('pdf')) return 'fa-file-pdf';
        if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'fa-file-word';
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.log')) return 'fa-file-text';
        return 'fa-file';
    };

    const openFilePicker = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${disabled
                    ? 'border-base-300 bg-base-200/50 cursor-not-allowed'
                    : dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-base-300 hover:border-primary/50 hover:bg-base-50'
                    } ${compact ? 'p-4' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFilePicker}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple
                    onChange={handleFileSelect}
                    disabled={disabled}
                    className="hidden"
                />

                <div className={`space-y-2 ${compact ? 'space-y-1' : ''}`}>
                    <div className={`w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center ${compact ? 'w-8 h-8' : ''}`}>
                        <i className={`fa-duotone fa-solid fa-cloud-arrow-up ${compact ? 'text-sm' : 'text-lg'} text-primary`} />
                    </div>

                    <div>
                        <p className={`font-medium text-base-content ${compact ? 'text-sm' : ''}`}>
                            {dragOver ? 'Drop files here' : 'Upload files'}
                        </p>
                        <p className={`text-base-content/60 ${compact ? 'text-xs' : 'text-sm'}`}>
                            Drag & drop or click to select
                        </p>
                    </div>

                    {!compact && (
                        <div className="text-xs text-base-content/40 space-y-1">
                            <p>Max {maxFiles} files, {formatFileSize(maxFileSize)} each</p>
                            <p>Supports: Images, PDF, Documents, Text files</p>
                        </div>
                    )}
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className={`font-medium text-base-content ${compact ? 'text-sm' : ''}`}>
                            Attached Files ({files.length}/{maxFiles})
                        </span>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => updateFiles([])}
                                className="text-xs text-base-content/60 hover:text-error transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className={`space-y-2 ${compact ? 'space-y-1' : ''}`}>
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className={`flex items-center gap-3 p-3 bg-base-100 border border-base-300 rounded-lg ${compact ? 'p-2' : ''}`}
                            >
                                {/* File Icon/Preview */}
                                <div className={`flex-shrink-0 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
                                    {file.preview ? (
                                        <Image
                                            src={file.preview || ''}
                                            alt={file.name}
                                            width={compact ? 24 : 32}
                                            height={compact ? 24 : 32}
                                            className={`object-cover rounded ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}
                                            unoptimized
                                        />
                                    ) : (
                                        <div className={`bg-base-200 rounded flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-8 h-8'}`}>
                                            <i className={`fa-duotone fa-solid ${getFileIcon(file)} ${compact ? 'text-xs' : 'text-sm'} text-base-content/60`} />
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-medium text-base-content truncate ${compact ? 'text-sm' : ''}`}>
                                        {file.name}
                                    </p>
                                    <p className={`text-base-content/60 ${compact ? 'text-xs' : 'text-sm'}`}>
                                        {formatFileSize(file.size)}
                                        {file.uploading && ' • Uploading...'}
                                        {file.uploaded && ' • Uploaded'}
                                        {file.error && ` • ${file.error}`}
                                    </p>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-2">
                                    {file.uploading && (
                                        <span className="loading loading-spinner loading-sm text-primary" />
                                    )}
                                    {file.uploaded && (
                                        <i className="fa-duotone fa-solid fa-check-circle text-success" />
                                    )}
                                    {file.error && (
                                        <i className="fa-duotone fa-solid fa-exclamation-triangle text-error" />
                                    )}
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={() => removeFile(file.id)}
                                            className="btn btn-ghost btn-xs btn-circle hover:btn-error"
                                            title="Remove file"
                                        >
                                            <i className="fa-duotone fa-solid fa-times text-xs" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Hook for easier file upload management
export function useFileUpload() {
    const [files, setFiles] = useState<FileUploadItem[]>([]);

    const addFiles = (newFiles: FileUploadItem[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const clearFiles = () => {
        setFiles([]);
    };

    const updateFileStatus = (id: string, updates: Partial<FileUploadItem>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    return {
        files,
        setFiles,
        addFiles,
        removeFile,
        clearFiles,
        updateFileStatus
    };
}

"use client";

import { useState } from "react";
import { HoverScale, FadeIn } from "@/components/ui/animated-page";
import DeleteDocumentButton from "@/components/delete-document-button";
import BulkDeleteButton from "@/components/bulk-delete-button";

function formatTokens(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

function formatChars(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
}

type DocRow = {
    id: string;
    url: string;
    title: string;
    created_at: string;
    site_id?: string;
    site_name?: string;
    site_domain?: string;
    source_kind?: string;
    source_title?: string;
    chunk_count: number;
    total_tokens: number;
    content_length: number;
}

interface SelectableDocumentsTableProps {
    docs: DocRow[];
    onRefresh?: () => void;
}

export default function SelectableDocumentsTable({ docs, onRefresh }: SelectableDocumentsTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(docs.map(d => d.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDeleteComplete = () => {
        setSelectedIds(new Set());
        if (onRefresh) {
            onRefresh();
        }
    };

    const isAllSelected = docs.length > 0 && selectedIds.size === docs.length;
    const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < docs.length;
    const selectedIdsArray = Array.from(selectedIds);

    if (docs.length === 0) {
        return (
            <FadeIn>
                <div className="card bg-base-100 rounded-2xl shadow-sm">
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <i className="fa-duotone fa-solid fa-book-open text-3xl text-primary" aria-hidden />
                        </div>
                        <h3 className="text-xl font-semibold text-base-content mb-3">No documents yet</h3>
                        <p className="text-base-content/60 mb-6 max-w-md mx-auto">
                            Start building your knowledge base by adding content sources. Your AI will learn from this content to provide better support.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
                            <i className="fa-duotone fa-solid fa-lightbulb text-xs" aria-hidden />
                            <span>Add URLs, sitemaps, or upload documents to get started</span>
                        </div>
                    </div>
                </div>
            </FadeIn>
        );
    }

    return (
        <div className="space-y-4">
            {/* Bulk Actions Toolbar */}
            {selectedIds.size > 0 && (
                <div className="bg-info/10 border border-info/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <i className="fa-duotone fa-solid fa-check-double text-info" aria-hidden />
                            <span className="font-medium text-info">
                                {selectedIds.size} document{selectedIds.size === 1 ? '' : 's'} selected
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="btn  btn-sm rounded-lg"
                            >
                                Clear Selection
                            </button>
                            <BulkDeleteButton
                                selectedIds={selectedIdsArray}
                                onDeleteComplete={handleDeleteComplete}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="card bg-base-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                {/* Desktop View */}
                <div className="hidden lg:block">
                    <div className="p-6 border-b border-base-200/60">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">Knowledge Base Documents</h3>
                                <p className="text-sm text-base-content/60 mt-1">Content your AI uses for training and responses</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-base-content/60">
                                    <i className="fa-duotone fa-solid fa-files text-xs" aria-hidden />
                                    <span>{docs.length} documents</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <HoverScale scale={1.05}>
                                        <button className="btn btn-sm  rounded-lg">
                                            <i className="fa-duotone fa-solid fa-download text-xs" aria-hidden />
                                            Export
                                        </button>
                                    </HoverScale>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-base-200/20">
                                <tr>
                                    <th className="text-left p-4 w-12">
                                        <label className="cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-primary"
                                                checked={isAllSelected}
                                                ref={(el) => {
                                                    if (el) el.indeterminate = isPartiallySelected;
                                                }}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                            />
                                        </label>
                                    </th>
                                    <th className="text-left p-4 text-sm font-semibold text-base-content/80">Document</th>
                                    <th className="text-left p-4 text-sm font-semibold text-base-content/80">Site / Source / URL</th>
                                    <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-32">Chunks</th>
                                    <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-40">Tokens</th>
                                    <th className="text-left p-4 text-sm font-semibold text-base-content/80 w-32">Added</th>
                                    <th className="text-right p-4 text-sm font-semibold text-base-content/80 w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-200/60">
                                {docs.map((d) => (
                                    <tr key={d.id} className={`hover:bg-base-200/30 transition-colors group ${selectedIds.has(d.id) ? 'bg-info/5' : ''}`}>
                                        <td className="p-4">
                                            <label className="cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-primary"
                                                    checked={selectedIds.has(d.id)}
                                                    onChange={(e) => handleSelectOne(d.id, e.target.checked)}
                                                />
                                            </label>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-info/20 transition-colors">
                                                    <i className="fa-duotone fa-solid fa-file-lines text-info" aria-hidden />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-base-content truncate mb-1" title={d.title}>
                                                        {d.title.slice(0, 30) || '(Untitled Document)'}
                                                    </div>
                                                    <div className="text-xs text-base-content/60">
                                                        ID: {d.id.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-1 min-w-[240px] max-w-[420px]">
                                                <div>
                                                    {d.site_name ? (
                                                        <div className="flex items-start gap-2">
                                                            <div className="w-6 h-6 bg-success/10 rounded-lg flex items-center justify-center mt-0.5">
                                                                <i className="fa-duotone fa-solid fa-globe text-xs text-success" aria-hidden />
                                                            </div>
                                                            <div className="leading-tight">
                                                                <div className="font-medium text-sm text-base-content">{d.site_name}</div>
                                                                <div className="text-xs text-base-content/60">{d.site_domain}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-base-300/60 rounded-lg flex items-center justify-center">
                                                                <i className="fa-duotone fa-solid fa-question text-xs text-base-content/40" aria-hidden />
                                                            </div>
                                                            <span className="text-base-content/40 text-sm">No site assigned</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {(d.source_title || d.source_kind) && (
                                                    <div className="text-xs text-base-content/60 pl-8">
                                                        Source: {d.source_title || `${d.source_kind} import`}
                                                    </div>
                                                )}
                                                <div className="pl-8">
                                                    <a
                                                        className="text-primary hover:text-primary/80 text-xs font-medium transition-colors flex items-center gap-1 max-w-full group/link"
                                                        href={d.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={d.url}
                                                    >
                                                        <span className="truncate inline-block">{d.url}</span>
                                                        <i className="fa-duotone fa-solid fa-external-link text-[10px] opacity-60 group-hover/link:opacity-100 transition-opacity flex-shrink-0" aria-hidden />
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium flex items-center gap-2">
                                                {d.chunk_count}
                                                {d.chunk_count === 0 && (
                                                    <span className="badge badge-warning badge-sm" title="Document has no chunks; ingestion may have failed or content was empty">0</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-base-content/50 mt-1">
                                                {d.chunk_count > 0 ? `${Math.round(d.content_length / d.chunk_count)} avg chars` : '—'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium" title={`${d.total_tokens} tokens total`}>
                                                {formatTokens(d.total_tokens)}
                                            </div>
                                            <div className="text-[10px] text-base-content/50 mt-1" title={`${d.content_length} characters`}>
                                                {formatChars(d.content_length)} chars
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-base-content/70">
                                                {new Date(d.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: new Date(d.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                                })}
                                            </div>
                                            <div className="text-xs text-base-content/50 mt-1">
                                                {new Date(d.created_at).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <DeleteDocumentButton id={d.id} onDeleteComplete={onRefresh} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile View */}
                <div className="lg:hidden">
                    <div className="p-6 border-b border-base-200/60">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-base-content">Documents</h3>
                                <p className="text-sm text-base-content/60">{docs.length} items in knowledge base</p>
                            </div>
                            <HoverScale scale={1.05}>
                                <button className="btn btn-sm  rounded-lg">
                                    <i className="fa-duotone fa-solid fa-filter text-xs" aria-hidden />
                                </button>
                            </HoverScale>
                        </div>
                        {/* Mobile Select All */}
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={isAllSelected}
                                    ref={(el) => {
                                        if (el) el.indeterminate = isPartiallySelected;
                                    }}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                                <span className="text-sm text-base-content/70">
                                    {isAllSelected ? 'Deselect All' : 'Select All'}
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        {docs.map((d) => (
                            <DocumentCard
                                key={d.id}
                                doc={d}
                                selected={selectedIds.has(d.id)}
                                onSelect={(checked) => handleSelectOne(d.id, checked)}
                                onRefresh={onRefresh}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface DocumentCardProps {
    doc: DocRow;
    selected: boolean;
    onSelect: (checked: boolean) => void;
    onRefresh?: () => void;
}

function DocumentCard({ doc, selected, onSelect, onRefresh }: DocumentCardProps) {
    return (
        <HoverScale scale={1.01}>
            <div className={`bg-base-200/40 rounded-xl border border-base-300/40 p-4 hover:bg-base-200/60 transition-all duration-200 ${selected ? 'bg-info/5 border-info/20' : ''}`}>
                <div className="flex items-start gap-3">
                    <label className="cursor-pointer mt-1">
                        <input
                            type="checkbox"
                            className="checkbox checkbox-primary"
                            checked={selected}
                            onChange={(e) => onSelect(e.target.checked)}
                        />
                    </label>
                    <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <i className="fa-duotone fa-solid fa-file-lines text-info" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-base-content line-clamp-2 flex-1" title={doc.title}>
                                {doc.title || '(Untitled Document)'}
                            </h4>
                            <DeleteDocumentButton id={doc.id} size="sm" onDeleteComplete={onRefresh} />
                        </div>

                        <div className="space-y-2 text-sm">
                            {doc.site_name && (
                                <div className="flex items-center gap-2">
                                    <i className="fa-duotone fa-solid fa-globe text-xs text-success" aria-hidden />
                                    <span className="text-base-content/70">{doc.site_name}</span>
                                </div>
                            )}
                            <a
                                className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group"
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <i className="fa-duotone fa-solid fa-link text-xs" aria-hidden />
                                <span className="truncate">{doc.url}</span>
                                <i className="fa-duotone fa-solid fa-external-link text-xs opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden />
                            </a>
                            <div className="flex items-center gap-2 text-base-content/60">
                                <i className="fa-duotone fa-solid fa-clock text-xs" aria-hidden />
                                <span>Added {new Date(doc.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: new Date(doc.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </HoverScale>
    );
}

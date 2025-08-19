"use client";

import { useState } from 'react';
import { useTenant } from "@/components/tenant-context";

type ExportFormat = 'csv' | 'json';
type ExportType = 'conversations' | 'messages' | 'integrations' | 'webhooks' | 'all';

type ExportControlsProps = {
    selectedSite?: string | null;
    selectedRange?: string;
    className?: string;
};

export function ExportControls({ selectedSite, selectedRange = '30d', className = "" }: ExportControlsProps) {
    const { tenantId } = useTenant();
    const [isExporting, setIsExporting] = useState(false);
    const [exportType, setExportType] = useState<ExportType>('conversations');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');

    const handleExport = async () => {
        if (!tenantId) return;

        try {
            setIsExporting(true);

            const params = new URLSearchParams({
                type: exportType,
                format: exportFormat,
                timeframe: selectedRange
            });

            if (selectedSite) {
                params.append('site', selectedSite);
            }

            const response = await fetch(`/api/analytics/export?${params}`);

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Get filename from content-disposition header or create one
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `analytics-${exportType}-${selectedRange}.${exportFormat}`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Export error:', error);
            // You might want to show a toast notification here
        } finally {
            setIsExporting(false);
        }
    };

    const exportTypes = [
        { value: 'conversations', label: 'Conversations', icon: 'fa-comments' },
        { value: 'messages', label: 'Messages', icon: 'fa-message' },
        { value: 'integrations', label: 'Integration Health', icon: 'fa-plug' },
        { value: 'webhooks', label: 'Webhook Deliveries', icon: 'fa-webhook' },
        { value: 'all', label: 'All Data', icon: 'fa-database' }
    ];

    return (
        <div className={`card bg-base-100 border border-base-200 shadow-sm ${className}`}>
            <div className="card-body p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-info/20 rounded-lg flex items-center justify-center">
                        <i className="fa-duotone fa-solid fa-download text-sm text-info" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Export Analytics Data</h3>
                        <p className="text-sm text-base-content/60">Download your analytics data for external analysis</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Export Type Selection */}
                    <div>
                        <label className="label">
                            <span className="label-text font-medium">Data Type</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={exportType}
                            onChange={(e) => setExportType(e.target.value as ExportType)}
                        >
                            {exportTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Format Selection */}
                    <div>
                        <label className="label">
                            <span className="label-text font-medium">Format</span>
                        </label>
                        <div className="flex gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="format"
                                    value="csv"
                                    checked={exportFormat === 'csv'}
                                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                    className="radio radio-primary radio-sm"
                                />
                                <span className="text-sm">CSV</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="format"
                                    value="json"
                                    checked={exportFormat === 'json'}
                                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                                    className="radio radio-primary radio-sm"
                                />
                                <span className="text-sm">JSON</span>
                            </label>
                        </div>
                    </div>

                    {/* Export Details */}
                    <div className="bg-base-200/50 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 text-base-content/70 mb-2">
                            <i className="fa-duotone fa-solid fa-info-circle" />
                            <span>Export Details</span>
                        </div>
                        <ul className="space-y-1 text-base-content/60">
                            <li>• Time period: {selectedRange === '1d' ? 'Last 24 hours' :
                                selectedRange === '7d' ? 'Last 7 days' :
                                    selectedRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</li>
                            <li>• Site filter: {selectedSite ? 'Specific site' : 'All sites'}</li>
                            <li>• Format: {exportFormat.toUpperCase()}</li>
                            <li>• Data type: {exportTypes.find(t => t.value === exportType)?.label}</li>
                        </ul>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`btn btn-primary w-full ${isExporting ? 'loading' : ''}`}
                    >
                        {!isExporting && <i className="fa-duotone fa-solid fa-download mr-2" />}
                        {isExporting ? 'Exporting...' : 'Export Data'}
                    </button>
                </div>
            </div>
        </div>
    );
}

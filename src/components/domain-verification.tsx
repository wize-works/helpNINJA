"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

type VerificationMethod = 'meta' | 'dns' | 'file';

type VerificationDetails = {
    verified: boolean;
    verification_token: string;
    verification_methods: {
        meta: {
            tag: string;
            instructions: string;
        };
        dns: {
            record: string;
            instructions: string;
        };
        file: {
            filename: string;
            content: string;
            path: string;
            instructions: string;
        };
    };
};

type DomainVerificationProps = {
    siteId: string;
    siteName: string;
    domain: string;
    initialVerified?: boolean;
    onVerificationChange?: (verified: boolean) => void;
};

export default function DomainVerification({
    siteId,
    siteName,
    domain,
    initialVerified = false,
    onVerificationChange
}: DomainVerificationProps) {
    const [verified, setVerified] = useState(initialVerified);
    const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<VerificationMethod>('meta');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showInstructions, setShowInstructions] = useState(!initialVerified);

    const loadVerificationDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sites/${siteId}/verify`, {
                // strict server-side tenant resolution; no client headers
            });

            if (res.ok) {
                const data = await res.json();
                setVerificationDetails(data);
                setVerified(data.verified);
            } else {
                console.error('Failed to load verification details');
            }
        } catch {
            console.error('Error loading verification details');
        } finally {
            setLoading(false);
        }
    }, [siteId]);

    useEffect(() => {
        if (!verified) {
            loadVerificationDetails();
        }
    }, [siteId, verified, loadVerificationDetails]);

    async function handleVerify() {
        setVerifying(true);
        const toastId = toast.loading(`Verifying domain via ${selectedMethod}...`);

        try {
            const res = await fetch(`/api/sites/${siteId}/verify`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({ method: selectedMethod })
            });

            const data = await res.json();

            if (data.verified) {
                setVerified(true);
                setShowInstructions(false);
                toast.success('Domain verified successfully!', { id: toastId });
                onVerificationChange?.(true);
            } else {
                toast.error(data.message || 'Verification failed', { id: toastId });
            }
        } catch {
            toast.error('Network error during verification', { id: toastId });
        } finally {
            setVerifying(false);
        }
    }

    function copyToClipboard(text: string, type: string) {
        navigator.clipboard.writeText(text).then(() => {
            toast.success(`${type} copied to clipboard!`);
        }).catch(() => {
            toast.error('Failed to copy to clipboard');
        });
    }

    if (loading) {
        return (
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span>Loading verification details...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (verified && !showInstructions) {
        return (
            <div className="alert alert-success">
                <i className="fa-duotone fa-solid fa-shield-check text-xl" aria-hidden />
                <div>
                    <h3 className="font-bold">Domain Verified</h3>
                    <div className="text-sm">
                        {siteName} ({domain}) is verified and ready to use the chat widget.
                    </div>
                </div>
                <button
                    onClick={() => setShowInstructions(true)}
                    className="btn btn-sm btn-ghost rounded-lg"
                >
                    View Details
                </button>
            </div>
        );
    }

    if (!verificationDetails) {
        return (
            <div className="alert alert-error">
                <i className="fa-duotone fa-solid fa-triangle-exclamation" aria-hidden />
                <span>Failed to load verification details</span>
                <button onClick={loadVerificationDetails} className="btn btn-sm rounded-lg">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Method Selection */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h4 className="font-semibold mb-4">Choose Verification Method</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="cursor-pointer flex flex-row">
                            <input
                                type="radio"
                                name="verification-method"
                                value="meta"
                                checked={selectedMethod === 'meta'}
                                onChange={(e) => setSelectedMethod(e.target.value as VerificationMethod)}
                                className="radio radio-primary"
                            />
                            <div className="ml-3">
                                <div className="font-medium">Meta Tag</div>
                                <div className="text-sm text-base-content/60">Add HTML tag to homepage</div>
                            </div>
                        </label>

                        <label className="cursor-pointer flex flex-row">
                            <input
                                type="radio"
                                name="verification-method"
                                value="dns"
                                checked={selectedMethod === 'dns'}
                                onChange={(e) => setSelectedMethod(e.target.value as VerificationMethod)}
                                className="radio radio-primary"
                            />
                            <div className="ml-3">
                                <div className="font-medium">DNS Record</div>
                                <div className="text-sm text-base-content/60">Add TXT record to DNS</div>
                            </div>
                        </label>

                        <label className="cursor-pointer flex flex-row">
                            <input
                                type="radio"
                                name="verification-method"
                                value="file"
                                checked={selectedMethod === 'file'}
                                onChange={(e) => setSelectedMethod(e.target.value as VerificationMethod)}
                                className="radio radio-primary"
                            />
                            <div className="ml-3">
                                <div className="font-medium">File Upload</div>
                                <div className="text-sm text-base-content/60">Upload verification file</div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="card bg-base-100 border border-base-300">
                <div className="card-body">
                    <h4 className="font-semibold mb-4">
                        {selectedMethod === 'meta' && 'Meta Tag Instructions'}
                        {selectedMethod === 'dns' && 'DNS Record Instructions'}
                        {selectedMethod === 'file' && 'File Upload Instructions'}
                    </h4>

                    <p className="text-base-content/60 mb-4">{verificationDetails.verification_methods[selectedMethod].instructions}</p>

                    {selectedMethod === 'meta' && verificationDetails && (
                        <div className="space-y-3">
                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">Meta tag to add:</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={verificationDetails.verification_methods.meta.tag}
                                        className="input input-bordered flex-1 font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(verificationDetails.verification_methods.meta.tag, 'Meta tag')}
                                        className="btn btn-outline btn-sm rounded-lg"
                                    >
                                        <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                                    </button>
                                </div>
                            </div>
                            <div className="alert alert-info">
                                <i className="fa-duotone fa-solid fa-info-circle" aria-hidden />
                                <span className="text-sm">
                                    Add this meta tag inside the &lt;head&gt; section of your homepage at https://{domain}
                                </span>
                            </div>
                        </div>
                    )}

                    {selectedMethod === 'dns' && verificationDetails && (
                        <div className="space-y-3">
                            <div>
                                <label className="label">
                                    <span className="label-text font-medium">DNS record to add:</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={verificationDetails.verification_methods.dns.record}
                                        className="input input-bordered flex-1 font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(verificationDetails.verification_methods.dns.record, 'DNS record')}
                                        className="btn btn-outline btn-sm rounded-lg"
                                    >
                                        <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                                    </button>
                                </div>
                            </div>
                            <div className="alert alert-info">
                                <i className="fa-duotone fa-solid fa-info-circle" aria-hidden />
                                <span className="text-sm">
                                    Add this TXT record to your domain&apos;s DNS settings. Changes may take up to 24 hours to propagate.
                                </span>
                            </div>
                        </div>
                    )}

                    {selectedMethod === 'file' && verificationDetails && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-medium">Filename:</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={verificationDetails.verification_methods.file.filename}
                                            className="input input-bordered flex-1 font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(verificationDetails.verification_methods.file.filename, 'Filename')}
                                            className="btn btn-outline btn-sm rounded-lg"
                                        >
                                            <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-medium">File content:</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={verificationDetails.verification_methods.file.content}
                                            className="input input-bordered flex-1 font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(verificationDetails.verification_methods.file.content, 'File content')}
                                            className="btn btn-outline btn-sm rounded-lg"
                                        >
                                            <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="alert alert-info">
                                <i className="fa-duotone fa-solid fa-info-circle" aria-hidden />
                                <div className="text-sm">
                                    <p>Upload the file to your domain root so it&apos;s accessible at:</p>
                                    <p className="font-mono mt-1">{verificationDetails.verification_methods.file.path}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Verify Button */}
            <div className="flex justify-center">
                <button
                    onClick={handleVerify}
                    className={`btn btn-primary btn-lg ${verifying ? 'loading' : ''}`}
                    disabled={verifying}
                >
                    {verifying ? (
                        <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Verifying...
                        </>
                    ) : (
                        <>
                            <i className="fa-duotone fa-solid fa-shield-check mr-2" aria-hidden />
                            Verify Domain
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

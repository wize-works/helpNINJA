"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';

type IntegrationDetails = {
    id: string;
    tenant_id: string;
    provider: string;
    name: string;
    status: 'active' | 'disabled' | 'error';
    credentials: Record<string, unknown>;
    config: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};

interface DeleteIntegrationFormProps {
    integration: IntegrationDetails;
}

export function DeleteIntegrationForm({ integration }: DeleteIntegrationFormProps) {
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const expectedConfirmation = `delete ${integration.name}`;
    const isConfirmationValid = confirmationText.toLowerCase() === expectedConfirmation.toLowerCase();

    const handleDelete = async () => {
        if (!isConfirmationValid) return;

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/integrations/${integration.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success({ message: 'Integration deleted successfully' });
                router.push('/dashboard/integrations');
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to delete integration');
            }
        } catch (error) {
            console.error('Error deleting integration:', error);
            toast.error({ message: 'Failed to delete integration' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
                <p className="text-base-content/60 mb-4">
                    To confirm deletion, type <code className="bg-base-200 px-2 py-1 rounded text-sm">delete {integration.name}</code> below:
                </p>

                <div className="form-control">
                    <input
                        type="text"
                        className="input input-bordered"
                        placeholder={`Type "delete ${integration.name}" to confirm`}
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={handleDelete}
                    disabled={!isConfirmationValid || isDeleting}
                    className={`btn btn-error rounded-xl ${isDeleting ? 'loading' : ''}`}
                >
                    {isDeleting ? 'Deleting...' : 'Delete Integration'}
                </button>

                <button
                    onClick={() => router.back()}
                    className="btn btn-ghost rounded-xl"
                    disabled={isDeleting}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

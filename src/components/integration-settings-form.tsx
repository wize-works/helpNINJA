"use client";

import { useState } from 'react';
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

interface IntegrationSettingsFormProps {
    integration: IntegrationDetails;
}

export function IntegrationSettingsForm({ integration }: IntegrationSettingsFormProps) {
    const [formData, setFormData] = useState({
        name: integration.name,
        config: { ...integration.config },
        credentials: { ...integration.credentials }
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleConfigChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            config: {
                ...prev.config,
                [key]: value
            }
        }));
    };

    const handleCredentialChange = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            credentials: {
                ...prev.credentials,
                [key]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`/api/integrations/${integration.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success({ message: 'Integration settings updated successfully' });
            } else {
                const error = await response.json();
                toast.apiError(error, 'Failed to update integration settings');
            }
        } catch (error) {
            console.error('Error updating integration:', error);
            toast.error({ message: 'Failed to update integration settings' });
        } finally {
            setIsLoading(false);
        }
    };

    const renderConfigFields = () => {
        switch (integration.provider) {
            case 'slack':
                return (
                    <div className="space-y-4">
                        <fieldset className="fieldset">
                            <label className="label">
                                Webhook URL
                                <span className="text-error">Required</span>
                            </label>
                            <input
                                type="url"
                                className="input input-bordered"
                                placeholder="https://hooks.slack.com/services/..."
                                value={(formData.config.webhook_url as string) || ''}
                                onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Slack webhook URL for receiving escalations
                                </span>
                            </label>
                        </fieldset>
                        <fieldset className="fieldset">
                            <label className="label">Channel</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                placeholder="#support"
                                value={(formData.config.channel as string) || ''}
                                onChange={(e) => handleConfigChange('channel', e.target.value)}
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Optional: Specify a default channel
                                </span>
                            </label>
                        </fieldset>
                    </div>
                );

            case 'teams':
                return (
                    <div className="space-y-4">
                        <fieldset className="fieldset">
                            <label className="label">
                                Webhook URL
                                <span className="text-error">Required</span>
                            </label>
                            <input
                                type="url"
                                className="input input-bordered"
                                placeholder="https://outlook.office.com/webhook/..."
                                value={(formData.config.webhook_url as string) || ''}
                                onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Microsoft Teams webhook URL for receiving escalations
                                </span>
                            </label>
                        </fieldset>
                        <fieldset className="fieldset">
                            <label className="label">Channel</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                placeholder="Support Team"
                                value={(formData.config.channel as string) || ''}
                                onChange={(e) => handleConfigChange('channel', e.target.value)}
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Optional: Specify a default channel or team name
                                </span>
                            </label>
                        </fieldset>
                        <div className="alert alert-info">
                            <i className="fa-duotone fa-solid fa-info-circle" />
                            <div>
                                <h4 className="font-medium">How to create a Teams webhook (Power Automate):</h4>
                                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                                    <li>Go to <strong>Power Automate</strong> and create a new &quot;Instant cloud flow&quot;</li>
                                    <li>Choose &quot;When a HTTP request is received&quot; as the trigger</li>
                                    <li>Add &quot;Post message in a chat or channel&quot; action for Teams</li>
                                    <li>Configure the Teams channel and set message format to &quot;Adaptive Card&quot;</li>
                                    <li>In the message field, use: <code>triggerOutputs()?[&apos;body&apos;]?[&apos;attachments&apos;]</code></li>
                                    <li>Save the flow and copy the HTTP trigger URL</li>
                                </ol>
                                <p className="text-xs mt-2 text-base-content/70">
                                    <strong>Note:</strong> Legacy webhook connectors are deprecated. This Power Automate method is required for modern Teams integrations.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'discord':
                return (
                    <div className="space-y-4">
                        <fieldset className="fieldset">
                            <label className="label">
                                Webhook URL
                                <span className="text-error">Required</span>
                            </label>
                            <input
                                type="url"
                                className="input input-bordered"
                                placeholder="https://discord.com/api/webhooks/..."
                                value={(formData.config.webhook_url as string) || ''}
                                onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Discord webhook URL for receiving escalation notifications
                                </span>
                            </label>
                        </fieldset>
                        <fieldset className="fieldset">
                            <label className="label">Bot Username</label>
                            <input
                                type="text"
                                className="input input-bordered"
                                placeholder="helpNINJA Bot"
                                value={(formData.config.username as string) || ''}
                                onChange={(e) => handleConfigChange('username', e.target.value)}
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Optional: Custom username for the bot (cannot contain &quot;discord&quot;)
                                </span>
                            </label>
                        </fieldset>
                        <div className="alert alert-info">
                            <i className="fa-duotone fa-solid fa-info-circle" />
                            <div>
                                <h4 className="font-medium">How to create a Discord webhook:</h4>
                                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                                    <li>Go to your Discord server and right-click on the target channel</li>
                                    <li>Select &quot;Edit Channel&quot; from the context menu</li>
                                    <li>Navigate to the &quot;Integrations&quot; tab</li>
                                    <li>Click &quot;Create Webhook&quot; and give it a name</li>
                                    <li>Optionally upload a custom avatar for the webhook</li>
                                    <li>Click &quot;Copy Webhook URL&quot; and paste it above</li>
                                </ol>
                                <p className="text-xs mt-2 text-base-content/70">
                                    <strong>Note:</strong> Webhooks allow external applications to send messages to Discord channels without requiring a bot account.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'zoom':
                return (
                    <div className="space-y-4">
                        <fieldset className="fieldset">
                            <label className="label">
                                Webhook URL
                                <span className="text-error">Required</span>
                            </label>
                            <input
                                type="url"
                                className="input input-bordered"
                                placeholder="https://integrations.zoom.us/chat/webhooks/incomingwebhook/{webhook_id}"
                                value={(formData.config.webhook_url as string) || ''}
                                onChange={(e) => handleConfigChange('webhook_url', e.target.value)}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    Zoom Incoming Webhook URL from the /inc connect command
                                </span>
                            </label>
                        </fieldset>
                        <fieldset className="fieldset">
                            <label className="label">
                                Verification Token
                                <span className="text-error">Required</span>
                            </label>
                            <input
                                type="password"
                                className="input input-bordered"
                                placeholder="Verification token from Zoom"
                                value={(formData.credentials.verification_token as string) || ''}
                                onChange={(e) => handleCredentialChange('verification_token', e.target.value)}
                                required
                            />
                            <label className="label">
                                <span className="label-text-alt">
                                    The verification token provided by Zoom when creating the connection
                                </span>
                            </label>
                        </fieldset>
                        <div className="alert alert-info">
                            <i className="fa-duotone fa-solid fa-info-circle" />
                            <div>
                                <h4 className="font-medium">How to set up Zoom Incoming Webhook:</h4>
                                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                                    <li>Sign in to the <strong>Zoom App Marketplace</strong> as an admin</li>
                                    <li>Search for &quot;Incoming Webhook&quot; and click <strong>Add</strong></li>
                                    <li>Authorize the app for your Zoom account</li>
                                    <li>Open Zoom desktop app and go to <strong>Team Chat</strong></li>
                                    <li>In your target channel, type: <code>/inc connect helpninja</code></li>
                                    <li>Copy the <strong>endpoint</strong> and <strong>verification token</strong> from the response</li>
                                </ol>
                                <p className="text-xs mt-2 text-base-content/70">
                                    <strong>Note:</strong> The Incoming Webhook chatbot will send you a private message with the endpoint URL and verification token after running the command.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            case 'email':
                return (
                    <div className="space-y-4">
                        <fieldset className="fieldset">
                            <label className="label">
                                To Email
                                <span className="text-error">Required</span>
                            </label>
                            <input
                                type="email"
                                className="input input-bordered"
                                placeholder="support@company.com"
                                value={(formData.config.to as string) || ''}
                                onChange={(e) => handleConfigChange('to', e.target.value)}
                                required
                            />
                        </fieldset>
                        <fieldset className="fieldset">
                            <label className="label">
                                <span className="label-text">From Email</span>
                            </label>
                            <input
                                type="email"
                                className="input input-bordered"
                                placeholder="noreply@company.com"
                                value={(formData.config.from as string) || ''}
                                onChange={(e) => handleConfigChange('from', e.target.value)}
                            />
                        </fieldset>
                        <fieldset className="fieldset">
                            <label className="label">
                                <span className="label-text">SMTP Server</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered"
                                placeholder="smtp.gmail.com"
                                value={(formData.credentials.smtp_host as string) || ''}
                                onChange={(e) => handleCredentialChange('smtp_host', e.target.value)}
                            />
                        </fieldset>
                        <div className="grid grid-cols-2 gap-4">
                            <fieldset className="fieldset">
                                <label className="label">
                                    <span className="label-text">SMTP Port</span>
                                </label>
                                <input
                                    type="number"
                                    className="input input-bordered"
                                    placeholder="587"
                                    value={(formData.credentials.smtp_port as string) || ''}
                                    onChange={(e) => handleCredentialChange('smtp_port', e.target.value)}
                                />
                            </fieldset>
                            <fieldset className="fieldset">
                                <label className="label">
                                    <span className="label-text">Encryption</span>
                                </label>
                                <select
                                    className="select select-bordered"
                                    value={(formData.credentials.smtp_encryption as string) || 'tls'}
                                    onChange={(e) => handleCredentialChange('smtp_encryption', e.target.value)}
                                >
                                    <option value="tls">TLS</option>
                                    <option value="ssl">SSL</option>
                                    <option value="none">None</option>
                                </select>
                            </fieldset>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <fieldset className="fieldset">
                                <label className="label">
                                    <span className="label-text">Username</span>
                                </label>
                                <input
                                    type="text"
                                    className="input input-bordered"
                                    value={(formData.credentials.smtp_username as string) || ''}
                                    onChange={(e) => handleCredentialChange('smtp_username', e.target.value)}
                                />
                            </fieldset>
                            <fieldset className="fieldset">
                                <label className="label">
                                    <span className="label-text">Password</span>
                                </label>
                                <input
                                    type="password"
                                    className="input input-bordered"
                                    value={(formData.credentials.smtp_password as string) || ''}
                                    onChange={(e) => handleCredentialChange('smtp_password', e.target.value)}
                                />
                            </fieldset>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="space-y-4">
                        <div className="alert alert-info">
                            <i className="fa-duotone fa-solid fa-info-circle" />
                            <span>
                                Settings for {integration.provider} integrations are not yet configurable through the UI.
                                Please contact support for configuration assistance.
                            </span>
                        </div>

                        {/* Generic config editor */}
                        <fieldset className="fieldset">
                            <label className="label">
                                <span className="label-text">Configuration (JSON)</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered h-32 font-mono text-sm"
                                placeholder="{}"
                                value={JSON.stringify(formData.config, null, 2)}
                                onChange={(e) => {
                                    try {
                                        const parsed = JSON.parse(e.target.value);
                                        setFormData(prev => ({ ...prev, config: parsed }));
                                    } catch {
                                        // Invalid JSON, don't update
                                    }
                                }}
                            />
                        </fieldset>
                    </div>
                );
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Settings</h3>

                <fieldset className="fieldset">
                    <label className="label">
                        <span className="label-text">Integration Name</span>
                    </label>
                    <input
                        type="text"
                        className="input input-bordered"
                        placeholder="My Integration"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                    />
                </fieldset>
            </div>

            <div className="divider"></div>

            {/* Provider-specific Settings */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium">
                    {integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} Settings
                </h3>
                {renderConfigFields()}
            </div>

            <div className="divider"></div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className={`btn btn-primary rounded-xl ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                    type="button"
                    className="btn  rounded-xl"
                    onClick={() => {
                        setFormData({
                            name: integration.name,
                            config: { ...integration.config },
                            credentials: { ...integration.credentials }
                        });
                    }}
                >
                    Reset
                </button>
            </div>
        </form>
    );
}

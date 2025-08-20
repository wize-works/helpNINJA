"use client";

import { useState, useEffect } from "react";
import { HoverScale } from "@/components/ui/animated-page";
import toast from "react-hot-toast";
import { useTenant } from "./tenant-context";

// Define the widget configuration schema
export interface WidgetConfigSchema {
    primaryColor: string;
    position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    welcomeMessage: string;
    aiName: string;
    showBranding: boolean;
    autoOpenDelay: number; // in milliseconds, 0 means disabled
    buttonIcon: "default" | "chat" | "help" | "message" | "custom";
    customIconUrl?: string;
    theme: "light" | "dark" | "auto";
    fontFamily?: string;
    voice: "friendly" | "professional" | "casual" | "formal";
}

// Default configuration values
const defaultConfig: WidgetConfigSchema = {
    primaryColor: "#7C3AED", // Purple
    position: "bottom-right",
    welcomeMessage: "👋 Hi there! How can I help you today?",
    aiName: "AI Assistant",
    showBranding: true,
    autoOpenDelay: 0,
    buttonIcon: "default",
    theme: "auto",
    voice: "friendly"
};

interface WidgetConfigurationProps {
    siteId: string;
    siteName: string;
    domain: string;
    isModal?: boolean;
    onClose?: () => void;
}

export default function WidgetConfiguration({
    siteId,
    domain,
    isModal = false,
    onClose
}: WidgetConfigurationProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<WidgetConfigSchema>(defaultConfig);
    const [activeTab, setActiveTab] = useState<"appearance" | "behavior" | "content">("appearance");

    // Load existing configuration
    // Import useTenant hook at the top of the file
    const { tenantId } = useTenant();

    useEffect(() => {
        const loadConfig = async () => {
            setLoading(true);
            try {
                // Include the tenant ID in the request headers
                const res = await fetch(`/api/sites/${siteId}/widget-config`, {
                    headers: {
                        'x-tenant-id': tenantId
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data);
                }
            } catch (err) {
                console.error("Failed to load widget configuration", err);
                // Fallback to defaults
                setConfig(defaultConfig);
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, [siteId, tenantId]);

    // Save configuration
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/sites/${siteId}/widget-config`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-tenant-id": tenantId
                },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                toast.success("Widget configuration saved");
                if (onClose && isModal) onClose();
            } else {
                const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                console.error("Failed to save configuration:", errorData);
                toast.error(`Failed to save configuration: ${errorData.error || res.status}`);
            }
        } catch (error) {
            console.error("Error saving configuration:", error);
            toast.error("Error saving configuration");
        } finally {
            setSaving(false);
        }
    };

    // Handle color change
    const handleColorChange = (color: string) => {
        setConfig(prev => ({ ...prev, primaryColor: color }));
    };

    // Handle position change
    const handlePositionChange = (position: WidgetConfigSchema["position"]) => {
        setConfig(prev => ({ ...prev, position }));
    };

    // Handle text input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    // Handle checkbox changes
    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setConfig(prev => ({ ...prev, [name]: checked }));
    };

    // Handle select changes
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    // Widget preview component
    const WidgetPreview = () => {
        return (
            <div className="relative w-full h-80 bg-base-200 rounded-xl overflow-hidden border border-base-300 mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-base-content/50">Website Content Placeholder</div>
                </div>

                {/* Chat widget preview */}
                <div
                    className="absolute"
                    style={{
                        bottom: config.position.includes("bottom") ? "20px" : "auto",
                        top: config.position.includes("top") ? "20px" : "auto",
                        right: config.position.includes("right") ? "20px" : "auto",
                        left: config.position.includes("left") ? "20px" : "auto",
                    }}
                >
                    {/* Chat bubble */}
                    <div
                        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: config.primaryColor }}
                    >
                        {config.buttonIcon === "default" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 956.64 755.1" style={{ width: "32px", height: "32px", fill: "white" }}>
                                <path d="M881.79,312.74c39.7-2.7,69.63,32.16,72.85,69.65,2.49,28.99,2.84,71.14,0,99.98-3.32,33.71-25.27,64.29-60.77,68.23-3.79.42-15.01-.53-16.75,1.25-1.57,1.6-3.92,11.56-5.29,14.71-36.91,85.11-121.05,139.58-212.45,148.55-21.08,34.37-64.81,45.83-102.74,37.28-73.64-16.61-62.97-110.41,15.52-118.5,30.57-3.15,53.55-.69,77.04,19.95,4.58,4.03.85,4.59,9.83,3.91,150.57-11.41,192.52-154.99,173.45-284.2-31.77-215.33-222.58-341.22-435.02-298.35C205.65,113.9,108.17,278.52,121.66,467.37c1.64,22.9,8.34,46.43,9.97,68.02,1.48,19.58-12.44,13.97-25.52,14.45-29.32,1.07-49.44,6.57-75.18-11.74-13.35-9.5-21.84-21.17-25.79-37.21-3.43-33.3-6.48-73.04-4.53-106.55,1.9-32.51,14.65-68,48.5-78.5,4.27-1.33,21.8-3.24,23.04-4.96,1.41-1.97,5.57-22.28,7.01-26.99C145.21,69.49,373.1-40.91,587.08,13.95c145.03,37.18,261.97,151.64,294.72,298.79Z" />
                                <path d="M428.45,329.17c42.73-1.25,88.12-1.04,130.7,1.72,66.55,4.31,205.78,20.26,213.38,106.62,8.53,96.89-108.27,127.26-183.69,109.69-28.27-6.59-51.79-21.81-78.66-30.34-68.8-21.84-107.58,30.48-171.03,35.01-65.52,4.67-173.87-28.91-159.04-113.04,17.6-99.83,168.87-107.34,248.34-109.66ZM322.44,399.16c-48.11,6.17-52.08,102.36,2.84,107.6,65.56,6.25,68.28-116.71-2.84-107.6ZM620.45,399.17c-51,5.3-55.76,92.59-5.58,105.99,68.17,18.2,78.14-113.52,5.58-105.99Z" />
                            </svg>
                        ) : config.buttonIcon === "chat" ? (
                            <i className="fa-duotone fa-solid fa-message text-white text-xl" />
                        ) : config.buttonIcon === "help" ? (
                            <i className="fa-duotone fa-solid fa-question text-white text-xl" />
                        ) : (
                            <i className="fa-duotone fa-solid fa-comment text-white text-xl" />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className={`${isModal ? "" : "container mx-auto py-8 px-4"}`}>
                <div className="flex items-center justify-center p-8">
                    <div className="loading loading-spinner loading-lg text-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isModal ? "" : "container mx-auto py-8 px-4"}`}>
            <div className={`${isModal ? "" : "bg-base-100 rounded-2xl shadow-sm p-6 border border-base-200/60"}`}>
                {!isModal && (
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-base-content">Widget Configuration</h2>
                        <p className="text-base-content/60 mt-1">Customize how your chat widget appears on {domain}</p>
                    </div>
                )}

                {/* Widget Preview */}
                <WidgetPreview />

                {/* Configuration Tabs */}
                <div className="flex mb-6 border-b border-base-200/60">
                    <button
                        onClick={() => setActiveTab("appearance")}
                        className={`px-4 py-3 ${activeTab === "appearance" ? "border-b-2 border-primary text-primary font-medium" : "text-base-content/60"}`}
                    >
                        <i className="fa-duotone fa-solid fa-palette mr-2" aria-hidden />
                        Appearance
                    </button>
                    <button
                        onClick={() => setActiveTab("behavior")}
                        className={`px-4 py-3 ${activeTab === "behavior" ? "border-b-2 border-primary text-primary font-medium" : "text-base-content/60"}`}
                    >
                        <i className="fa-duotone fa-solid fa-gears mr-2" aria-hidden />
                        Behavior
                    </button>
                    <button
                        onClick={() => setActiveTab("content")}
                        className={`px-4 py-3 ${activeTab === "content" ? "border-b-2 border-primary text-primary font-medium" : "text-base-content/60"}`}
                    >
                        <i className="fa-duotone fa-solid fa-message-text mr-2" aria-hidden />
                        Content
                    </button>
                </div>

                {/* Appearance Tab */}
                {activeTab === "appearance" && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-items-start gap-4">
                            {/* Theme */}
                            <div className="flex flex-col gap-4 flex-1">
                                <div>
                                    <label className="text-sm font-medium text-base-content block mb-2">Theme</label>
                                    <select
                                        name="theme"
                                        value={config.theme}
                                        onChange={handleSelectChange}
                                        className="select select-bordered w-full max-w-md"
                                    >
                                        <option value="light">Light</option>
                                        <option value="dark">Dark</option>
                                        <option value="auto">Auto (Match User Preference)</option>
                                    </select>
                                    <p className="text-xs text-base-content/60 mt-1">Choose the color theme for your chat widget</p>
                                </div>
                                {/* Primary Color */}
                                <div className="flex flex-col md:flex-row md:justify-between gap-6">
                                    <div>
                                        <label className="text-sm font-medium text-base-content block mb-2">Primary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={config.primaryColor}
                                                onChange={(e) => handleColorChange(e.target.value)}
                                                className="w-10 h-10 rounded cursor-pointer border-none"
                                            />
                                            <input
                                                type="text"
                                                name="primaryColor"
                                                value={config.primaryColor}
                                                onChange={handleInputChange}
                                                className="input input-bordered w-32 font-mono"
                                            />
                                        </div>
                                        <p className="text-xs text-base-content/60 mt-1">Choose the main color for your chat widget</p>
                                    </div>
                                </div>
                            </div>
                            {/* Button Icon */}
                            <div className="flex flex-col gap-4 flex-1">
                                <div>
                                    <label className="text-sm font-medium text-base-content block mb-2">Button Icon</label>
                                    <div className="flex flex-wrap gap-3">
                                        <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="buttonIcon"
                                                value="default"
                                                checked={config.buttonIcon === 'default'}
                                                onChange={(e) => setConfig(prev => ({ ...prev, buttonIcon: e.target.value as WidgetConfigSchema["buttonIcon"] }))}
                                                className="radio radio-primary radio-sm"
                                            />
                                            <span className="text-sm">Logo</span>
                                        </label>
                                        <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="buttonIcon"
                                                value="chat"
                                                checked={config.buttonIcon === 'chat'}
                                                onChange={(e) => setConfig(prev => ({ ...prev, buttonIcon: e.target.value as WidgetConfigSchema["buttonIcon"] }))}
                                                className="radio radio-primary radio-sm"
                                            />
                                            <span className="text-sm">Chat</span>
                                        </label>
                                        <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="buttonIcon"
                                                value="help"
                                                checked={config.buttonIcon === 'help'}
                                                onChange={(e) => setConfig(prev => ({ ...prev, buttonIcon: e.target.value as WidgetConfigSchema["buttonIcon"] }))}
                                                className="radio radio-primary radio-sm"
                                            />
                                            <span className="text-sm">Help</span>
                                        </label>
                                        <label className="flex items-center gap-2 h-10 px-4 border border-base-300 rounded-xl bg-base-200/50 hover:bg-base-200 transition-all duration-200 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="buttonIcon"
                                                value="message"
                                                checked={config.buttonIcon === 'message'}
                                                onChange={(e) => setConfig(prev => ({ ...prev, buttonIcon: e.target.value as WidgetConfigSchema["buttonIcon"] }))}
                                                className="radio radio-primary radio-sm"
                                            />
                                            <span className="text-sm">Message</span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-base-content/60 mt-1">Choose the icon for your chat button</p>
                                </div>
                                {/* Position */}
                                <div>
                                    <label className="text-sm font-medium text-base-content block mb-2">Widget Position</label>
                                    <div className="grid grid-cols-2 gap-3 max-w-md">
                                        <button
                                            type="button"
                                            onClick={() => handlePositionChange("bottom-right")}
                                            className={`px-4 py-3 flex items-center justify-center border rounded-xl ${config.position === "bottom-right" ? "border-primary bg-primary/5" : "border-base-300"
                                                }`}
                                        >
                                            <div className="w-20 h-20 bg-base-200 rounded relative">
                                                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-primary"></div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePositionChange("bottom-left")}
                                            className={`px-4 py-3 flex items-center justify-center border rounded-xl ${config.position === "bottom-left" ? "border-primary bg-primary/5" : "border-base-300"
                                                }`}
                                        >
                                            <div className="w-20 h-20 bg-base-200 rounded relative">
                                                <div className="absolute bottom-1 left-1 w-4 h-4 rounded-full bg-primary"></div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePositionChange("top-right")}
                                            className={`px-4 py-3 flex items-center justify-center border rounded-xl ${config.position === "top-right" ? "border-primary bg-primary/5" : "border-base-300"
                                                }`}
                                        >
                                            <div className="w-20 h-20 bg-base-200 rounded relative">
                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary"></div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handlePositionChange("top-left")}
                                            className={`px-4 py-3 flex items-center justify-center border rounded-xl ${config.position === "top-left" ? "border-primary bg-primary/5" : "border-base-300"
                                                }`}
                                        >
                                            <div className="w-20 h-20 bg-base-200 rounded relative">
                                                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-primary"></div>
                                            </div>
                                        </button>
                                    </div>
                                    <p className="text-xs text-base-content/60 mt-1">Select where the widget should appear on your website</p>
                                </div>
                            </div>
                        </div>


                    </div>
                )}

                {/* Behavior Tab */}
                {activeTab === "behavior" && (
                    <div className="space-y-6">
                        {/* Auto-Open Delay */}
                        <div>
                            <label className="text-sm font-medium text-base-content block mb-2">Auto-Open Delay (ms)</label>
                            <input
                                type="number"
                                name="autoOpenDelay"
                                value={config.autoOpenDelay}
                                onChange={handleInputChange}
                                className="input input-bordered w-full max-w-md"
                                min="0"
                                step="1000"
                            />
                            <p className="text-xs text-base-content/60 mt-1">
                                Set to 0 to disable auto-open. Otherwise, the widget will automatically open after the specified delay (in milliseconds).
                            </p>
                        </div>

                        {/* Show Branding */}
                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    name="showBranding"
                                    checked={config.showBranding}
                                    onChange={handleCheckboxChange}
                                    className="checkbox checkbox-primary"
                                />
                                <span className="label-text">Show helpNINJA Branding</span>
                            </label>
                            <p className="text-xs text-base-content/60 ml-7">
                                Display &quot;Powered by helpNINJA&quot; in the widget footer
                            </p>
                        </div>

                        {/* Voice */}
                        <div>
                            <label className="text-sm font-medium text-base-content block mb-2">AI Voice</label>
                            <select
                                name="voice"
                                value={config.voice}
                                onChange={handleSelectChange}
                                className="select select-bordered w-full max-w-md"
                            >
                                <option value="friendly">Friendly</option>
                                <option value="professional">Professional</option>
                                <option value="casual">Casual</option>
                                <option value="formal">Formal</option>
                            </select>
                            <p className="text-xs text-base-content/60 mt-1">Select the personality for your AI assistant</p>
                        </div>
                    </div>
                )}

                {/* Content Tab */}
                {activeTab === "content" && (
                    <div className="space-y-6">
                        {/* Welcome Message */}
                        <div>
                            <label className="text-sm font-medium text-base-content block mb-2">Welcome Message</label>
                            <textarea
                                name="welcomeMessage"
                                value={config.welcomeMessage}
                                onChange={handleInputChange}
                                className="textarea textarea-bordered w-full h-24"
                                placeholder="Enter a welcome message..."
                            ></textarea>
                            <p className="text-xs text-base-content/60 mt-1">
                                This message appears when a user first opens the chat widget
                            </p>
                        </div>

                        {/* AI Name */}
                        <div>
                            <label className="text-sm font-medium text-base-content block mb-2">AI Assistant Name</label>
                            <input
                                type="text"
                                name="aiName"
                                value={config.aiName}
                                onChange={handleInputChange}
                                className="input input-bordered w-full max-w-md"
                                placeholder="AI Assistant"
                            />
                            <p className="text-xs text-base-content/60 mt-1">
                                Name your AI assistant
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 mt-8">
                    {isModal && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost rounded-xl"
                        >
                            Cancel
                        </button>
                    )}
                    <HoverScale scale={1.05}>
                        <button
                            type="button"
                            onClick={handleSave}
                            className={`btn btn-primary rounded-xl min-w-32 ${saving ? 'loading' : ''}`}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <i className="fa-duotone fa-solid fa-save mr-2" aria-hidden />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </HoverScale>
                </div>
            </div>
        </div>
    );
}

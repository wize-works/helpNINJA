"use client";

import { useState, useEffect } from "react";
import { HoverScale } from "@/components/ui/animated-page";
import toast from "react-hot-toast";
import { useTenant } from "./tenant-context";
import Logo from "./logo";
import Link from "next/link";

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
    // New styling options
    bubbleBackground?: string;
    bubbleColor?: string;
    panelBackground?: string;
    panelHeaderBackground?: string;
    messagesBackground?: string;
    userBubbleBackground?: string;
    userBubbleColor?: string;
    assistantBubbleBackground?: string;
    assistantBubbleColor?: string;
    buttonBackground?: string;
    buttonColor?: string;
}

// Default configuration values
const defaultConfig: WidgetConfigSchema = {
    primaryColor: "#4DA8DA", // Purple
    position: "bottom-right",
    welcomeMessage: "👋 Hi there! How can I help you today?",
    aiName: "AI Assistant",
    showBranding: true,
    autoOpenDelay: 0,
    buttonIcon: "default",
    theme: "light",
    voice: "friendly",
    // New styling defaults
    bubbleBackground: "#111",
    bubbleColor: "#fff",
    panelBackground: "#fff",
    panelHeaderBackground: "#4DA8DA",
    messagesBackground: "#f8fafc",
    userBubbleBackground: "#3b82f6",
    userBubbleColor: "#fff",
    assistantBubbleBackground: "#e5e7eb",
    assistantBubbleColor: "#111",
    buttonBackground: "#111",
    buttonColor: "#fff"
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

    // Handle specific color changes
    const handleSpecificColorChange = (field: keyof WidgetConfigSchema, color: string) => {
        setConfig(prev => ({ ...prev, [field]: color }));
    };

    // Apply theme presets
    const applyThemePreset = (preset: 'default' | 'dark' | 'light' | 'corporate' | 'warm') => {
        switch (preset) {
            case 'default':
                setConfig(prev => ({
                    ...prev,
                    primaryColor: defaultConfig.primaryColor,
                    bubbleBackground: defaultConfig.bubbleBackground,
                    bubbleColor: defaultConfig.bubbleColor,
                    panelBackground: defaultConfig.panelBackground,
                    panelHeaderBackground: defaultConfig.panelHeaderBackground,
                    messagesBackground: defaultConfig.messagesBackground,
                    userBubbleBackground: defaultConfig.userBubbleBackground,
                    userBubbleColor: defaultConfig.userBubbleColor,
                    assistantBubbleBackground: defaultConfig.assistantBubbleBackground,
                    assistantBubbleColor: defaultConfig.assistantBubbleColor,
                    buttonBackground: defaultConfig.buttonBackground,
                    buttonColor: defaultConfig.buttonColor
                }));
                break;
            case 'dark':
                setConfig(prev => ({
                    ...prev,
                    primaryColor: "#1E293B",
                    bubbleBackground: "#0f172a",
                    bubbleColor: "#fff",
                    panelBackground: "#1E293B",
                    panelHeaderBackground: "#0f172a",
                    messagesBackground: "#334155",
                    userBubbleBackground: "#3b82f6",
                    userBubbleColor: "#fff",
                    assistantBubbleBackground: "#475569",
                    assistantBubbleColor: "#f8fafc",
                    buttonBackground: "#1E293B",
                    buttonColor: "#fff"
                }));
                break;
            case 'light':
                setConfig(prev => ({
                    ...prev,
                    primaryColor: "#64748b",
                    bubbleBackground: "#f1f5f9",
                    bubbleColor: "#334155",
                    panelBackground: "#fff",
                    panelHeaderBackground: "#f8fafc",
                    messagesBackground: "#f1f5f9",
                    userBubbleBackground: "#64748b",
                    userBubbleColor: "#fff",
                    assistantBubbleBackground: "#e2e8f0",
                    assistantBubbleColor: "#334155",
                    buttonBackground: "#64748b",
                    buttonColor: "#fff"
                }));
                break;
            case 'corporate':
                setConfig(prev => ({
                    ...prev,
                    primaryColor: "#0369a1",
                    bubbleBackground: "#0284c7",
                    bubbleColor: "#fff",
                    panelBackground: "#fff",
                    panelHeaderBackground: "#0369a1",
                    messagesBackground: "#f0f9ff",
                    userBubbleBackground: "#0284c7",
                    userBubbleColor: "#fff",
                    assistantBubbleBackground: "#e0f2fe",
                    assistantBubbleColor: "#0c4a6e",
                    buttonBackground: "#0369a1",
                    buttonColor: "#fff"
                }));
                break;
            case 'warm':
                setConfig(prev => ({
                    ...prev,
                    primaryColor: "#ea580c",
                    bubbleBackground: "#f97316",
                    bubbleColor: "#fff",
                    panelBackground: "#fff",
                    panelHeaderBackground: "#ea580c",
                    messagesBackground: "#fff7ed",
                    userBubbleBackground: "#f97316",
                    userBubbleColor: "#fff",
                    assistantBubbleBackground: "#ffedd5",
                    assistantBubbleColor: "#7c2d12",
                    buttonBackground: "#ea580c",
                    buttonColor: "#fff"
                }));
                break;
        }
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
        const [showChat, setShowChat] = useState(false);
        const [autoOpenTriggered, setAutoOpenTriggered] = useState(false);
        const [iframeError, setIframeError] = useState(false);
        const [iframeLoading, setIframeLoading] = useState(true);

        // Handle auto-open functionality
        useEffect(() => {
            // Use a local value from the current render to avoid dependency issues
            const currentDelay = config.autoOpenDelay;

            if (currentDelay > 0 && !autoOpenTriggered) {
                const timer = setTimeout(() => {
                    setShowChat(true);
                    setAutoOpenTriggered(true);
                }, currentDelay);

                return () => clearTimeout(timer);
            }
        }, [autoOpenTriggered]);

        // Toggle chat window open/closed
        const toggleChat = () => {
            setShowChat(prev => !prev);
        };

        return (
            <div className="relative w-full h-180 bg-base-200 rounded-xl overflow-hidden border border-base-300 mb-6">
                {/* Website iframe */}
                {!iframeError && (
                    <>
                        <iframe
                            src={domain.includes('://') ? domain : `https://${domain}`}
                            className="absolute inset-0 w-full h-full border-0"
                            title={`Preview of ${domain}`}
                            sandbox="allow-same-origin allow-scripts allow-forms"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            style={{ opacity: iframeLoading ? 0 : 1 }}
                            onError={() => {
                                setIframeError(true);
                                setIframeLoading(false);
                            }}
                            onLoad={() => {
                                // If the iframe loads, make sure error state is reset
                                setIframeError(false);
                                setIframeLoading(false);
                            }}
                        />

                        {/* Loading indicator */}
                        {iframeLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-base-content/50 flex flex-col items-center">
                                    <div className="loading loading-spinner loading-lg mb-2"></div>
                                    <div>Loading website preview...</div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Fallback if iframe fails to load */}
                {iframeError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-base-content/50 flex flex-col items-center">
                            <i className="fa-duotone fa-solid fa-globe mb-2 text-2xl" aria-hidden />
                            <div>{domain}</div>
                            <div className="text-xs mt-1 opacity-70">
                                Unable to load website preview
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => setIframeError(false)}
                                >
                                    <i className="fa-duotone fa-solid fa-rotate-right mr-2" aria-hidden />
                                    Try again
                                </button>
                                <a
                                    href={domain.includes('://') ? domain : `https://${domain}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm"
                                >
                                    <i className="fa-duotone fa-solid fa-external-link mr-2" aria-hidden />
                                    Open site
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Real-time configuration indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-success/10 text-success px-3 py-1 rounded-lg text-xs">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    <span>Real-time preview</span>
                </div>

                {/* Info about preview limitations */}
                {!iframeError && !iframeLoading && (
                    <div className="absolute top-2 right-2 tooltip tooltip-left" data-tip="Some sites may restrict embedding in iframes">
                        <button className="btn btn-circle btn-xs btn-ghost text-base-content/50">
                            <i className="fa-duotone fa-solid fa-circle-info" />
                        </button>
                    </div>
                )}

                {/* Chat widget preview */}
                <div
                    className="absolute transition-all duration-300"
                    style={{
                        bottom: config.position.includes("bottom") ? "20px" : "auto",
                        top: config.position.includes("top") ? "20px" : "auto",
                        right: config.position.includes("right") ? "20px" : "auto",
                        left: config.position.includes("left") ? "20px" : "auto",
                    }}
                >
                    {/* Chat window (shown when button is clicked) */}
                    {showChat && (
                        <div
                            className="bg-base-100 rounded-xl shadow-2xl mb-4 w-72 transform transition-all duration-300"
                            style={{
                                boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`,
                                borderColor: config.theme === 'dark' ? '#1e293b' : '#f1f5f9',
                                borderWidth: '1px',
                                animation: 'fadeInUp 0.3s ease-out forwards'
                            }}
                        >
                            {/* Chat header */}
                            <div className="p-4 border-b flex items-center justify-between rounded-t-xl"
                                style={{ backgroundColor: config.panelHeaderBackground, borderColor: 'rgba(255,255,255,0.1)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 p-1 rounded-full bg-white/20 flex items-center justify-center">
                                        <Logo className="text-base-100" />
                                    </div>
                                    <span className="text-white font-medium">{config.aiName || 'AI Assistant'}</span>
                                </div>
                                <button onClick={toggleChat} className="text-white/80 hover:text-white transition-colors">
                                    <i className="fa-duotone fa-solid fa-xmark" />
                                </button>
                            </div>

                            {/* Chat content */}
                            <div className="p-4 h-64 overflow-y-auto">
                                {/* AI message */}
                                <div className="flex gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-robot text-primary text-sm" />
                                    </div>
                                    <div className="bg-base-200 p-3 rounded-xl rounded-tl-none max-w-[80%] animate-fadeIn">
                                        <p className="text-sm">{config.welcomeMessage || '👋 Hi there! How can I help you today?'}</p>
                                    </div>
                                </div>

                                {/* User message */}
                                <div className="flex flex-row-reverse gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-base-200 flex-shrink-0 flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-user text-base-content/60 text-sm" />
                                    </div>
                                    <div className="bg-primary/10 p-3 rounded-xl rounded-tr-none max-w-[80%] animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                                        <p className="text-sm">Hi, I have a question about your services.</p>
                                    </div>
                                </div>

                                {/* Typing indicator - AI response */}
                                <div className="flex gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center">
                                        <i className="fa-duotone fa-solid fa-robot text-primary text-sm" />
                                    </div>
                                    <div className="bg-base-200 p-3 rounded-xl rounded-tl-none max-w-[80%] animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                            <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chat input */}
                            <div className="p-3 border-t">
                                <div className="flex items-center gap-2">
                                    <input type="text"
                                        placeholder="Type your message..."
                                        className="input input-sm input-bordered flex-grow rounded-full text-sm"
                                        disabled
                                    />
                                    <button className="btn btn-sm btn-circle" style={{ backgroundColor: config.primaryColor }}>
                                        <i className="fa-duotone fa-solid fa-paper-plane text-white" />
                                    </button>
                                </div>

                                {/* Branding */}
                                {config.showBranding && (
                                    <div className="text-center mt-2 text-xs text-base-content/40">
                                        Powered by <Link href={"https://helpNINJA.ai"}>helpNINJA</Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Chat bubble */}
                    <div
                        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300 ${showChat ? 'scale-110 rotate-180' : ''}`}
                        style={{ backgroundColor: config.primaryColor }}
                        onClick={toggleChat}
                    >
                        {showChat ? (
                            <i className="fa-duotone fa-solid fa-xmark text-white text-xl" />
                        ) : config.buttonIcon === "default" ? (
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
                        <div className="flex items-center gap-2 mt-2 text-sm text-info">
                            <i className="fa-duotone fa-solid fa-sparkles" aria-hidden />
                            <span>New! Changes now appear in real-time in the preview area</span>
                        </div>
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
                        {/* Theme Presets */}
                        <div className="mb-8">
                            <label className="text-sm font-medium text-base-content block mb-3">Theme Presets</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${config.primaryColor === defaultConfig.primaryColor &&
                                        config.bubbleBackground === defaultConfig.bubbleBackground ?
                                        'ring-2 ring-primary' : ''
                                        }`}
                                    onClick={() => applyThemePreset('default')}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: defaultConfig.primaryColor }}></div>
                                        <div className="font-medium">Default</div>
                                    </div>
                                    <p className="text-xs text-base-content/60">Our signature theme with perfect contrast</p>
                                </div>

                                <div
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${config.primaryColor === "#1E293B" &&
                                        config.bubbleBackground === "#0f172a" ?
                                        'ring-2 ring-primary' : ''
                                        }`}
                                    onClick={() => applyThemePreset('dark')}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <div className="w-5 h-5 rounded-full bg-[#1E293B]"></div>
                                        <div className="font-medium">Dark Mode</div>
                                    </div>
                                    <p className="text-xs text-base-content/60">Sleek dark theme with light text</p>
                                </div>

                                <div
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${config.primaryColor === "#64748b" &&
                                        config.bubbleBackground === "#f1f5f9" ?
                                        'ring-2 ring-primary' : ''
                                        }`}
                                    onClick={() => applyThemePreset('light')}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <div className="w-5 h-5 rounded-full bg-[#64748b]"></div>
                                        <div className="font-medium">Light Modern</div>
                                    </div>
                                    <p className="text-xs text-base-content/60">Minimal light theme with gray accents</p>
                                </div>

                                <div
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${config.primaryColor === "#0369a1" &&
                                        config.bubbleBackground === "#0284c7" ?
                                        'ring-2 ring-primary' : ''
                                        }`}
                                    onClick={() => applyThemePreset('corporate')}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <div className="w-5 h-5 rounded-full bg-[#0369a1]"></div>
                                        <div className="font-medium">Corporate Blue</div>
                                    </div>
                                    <p className="text-xs text-base-content/60">Professional blue theme for business sites</p>
                                </div>

                                <div
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md ${config.primaryColor === "#ea580c" &&
                                        config.bubbleBackground === "#f97316" ?
                                        'ring-2 ring-primary' : ''
                                        }`}
                                    onClick={() => applyThemePreset('warm')}
                                >
                                    <div className="flex gap-2 items-center mb-2">
                                        <div className="w-5 h-5 rounded-full bg-[#ea580c]"></div>
                                        <div className="font-medium">Warm Orange</div>
                                    </div>
                                    <p className="text-xs text-base-content/60">Friendly orange theme for welcoming experience</p>
                                </div>
                            </div>
                        </div>

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

                        {/* Advanced Styling Section */}
                        <details className="collapse collapse-plus bg-base-200 rounded-lg">
                            <summary className="collapse-title font-medium">
                                Advanced Styling Options
                            </summary>
                            <div className="collapse-content space-y-6">
                                {/* Bubble Styling */}
                                <div className="p-4 border border-base-300 rounded-lg">
                                    <h3 className="text-lg font-medium mb-3">Bubble Styling</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Bubble Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.bubbleBackground || "#111"}
                                                    onChange={(e) => handleSpecificColorChange('bubbleBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="bubbleBackground"
                                                    value={config.bubbleBackground || "#111"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Bubble Text Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.bubbleColor || "#fff"}
                                                    onChange={(e) => handleSpecificColorChange('bubbleColor', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="bubbleColor"
                                                    value={config.bubbleColor || "#fff"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Panel Styling */}
                                <div className="p-4 border border-base-300 rounded-lg">
                                    <h3 className="text-lg font-medium mb-3">Panel Styling</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Panel Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.panelBackground || "#fff"}
                                                    onChange={(e) => handleSpecificColorChange('panelBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="panelBackground"
                                                    value={config.panelBackground || "#fff"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Header Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.panelHeaderBackground || "#f8fafc"}
                                                    onChange={(e) => handleSpecificColorChange('panelHeaderBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="panelHeaderBackground"
                                                    value={config.panelHeaderBackground || "#f8fafc"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Messages Area Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.messagesBackground || "#f8fafc"}
                                                    onChange={(e) => handleSpecificColorChange('messagesBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="messagesBackground"
                                                    value={config.messagesBackground || "#f8fafc"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Message Styling */}
                                <div className="p-4 border border-base-300 rounded-lg">
                                    <h3 className="text-lg font-medium mb-3">Message Styling</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">User Message Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.userBubbleBackground || "#3b82f6"}
                                                    onChange={(e) => handleSpecificColorChange('userBubbleBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="userBubbleBackground"
                                                    value={config.userBubbleBackground || "#3b82f6"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">User Message Text Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.userBubbleColor || "#fff"}
                                                    onChange={(e) => handleSpecificColorChange('userBubbleColor', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="userBubbleColor"
                                                    value={config.userBubbleColor || "#fff"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Assistant Message Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.assistantBubbleBackground || "#e5e7eb"}
                                                    onChange={(e) => handleSpecificColorChange('assistantBubbleBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="assistantBubbleBackground"
                                                    value={config.assistantBubbleBackground || "#e5e7eb"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Assistant Message Text Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.assistantBubbleColor || "#111"}
                                                    onChange={(e) => handleSpecificColorChange('assistantBubbleColor', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="assistantBubbleColor"
                                                    value={config.assistantBubbleColor || "#111"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Button Styling */}
                                <div className="p-4 border border-base-300 rounded-lg">
                                    <h3 className="text-lg font-medium mb-3">Button Styling</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Send Button Background</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.buttonBackground || "#111"}
                                                    onChange={(e) => handleSpecificColorChange('buttonBackground', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="buttonBackground"
                                                    value={config.buttonBackground || "#111"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-base-content block mb-2">Send Button Text Color</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={config.buttonColor || "#fff"}
                                                    onChange={(e) => handleSpecificColorChange('buttonColor', e.target.value)}
                                                    className="w-10 h-10 rounded cursor-pointer border-none"
                                                />
                                                <input
                                                    type="text"
                                                    name="buttonColor"
                                                    value={config.buttonColor || "#fff"}
                                                    onChange={handleInputChange}
                                                    className="input input-bordered w-32 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>

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

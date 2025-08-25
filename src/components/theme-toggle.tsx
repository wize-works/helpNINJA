"use client";

import { useEffect, useState } from "react";
import { HoverScale } from "./ui/animated-page";

type Mode = "light" | "dark" | "system";
type ThemeName = "light" | "dark" | "corporate"; // extend as you add more

const STORAGE_KEY = "hn_theme_mode";
const STORAGE_THEME = "hn_theme_name";

// map our modes to DaisyUI theme names
const LIGHT_THEME: ThemeName = "light";
const DARK_THEME: ThemeName = "dark";

function systemPrefersDark() {
    return typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: Mode, explicitTheme?: ThemeName) {
    const theme =
        mode === "system"
            ? (systemPrefersDark() ? DARK_THEME : LIGHT_THEME)
            : mode === "dark"
                ? DARK_THEME
                : LIGHT_THEME;

    // allow an explicit non-light/dark theme if passed (e.g., corporate)
    const final = explicitTheme ?? theme;


    // toggle dark class for Tailwind dark: utilities to play nice with DaisyUI
    if (mode === "dark" || (mode === "system" && systemPrefersDark())) {
        document.querySelector("html")?.setAttribute("data-theme", DARK_THEME);
    } else {
        document.querySelector("html")?.setAttribute("data-theme", LIGHT_THEME);
    }
    localStorage.setItem(STORAGE_THEME, final);
}

const themeOptions = [
    {
        mode: "light" as Mode,
        label: "Light",
        icon: "fa-sun",
        description: "Light appearance"
    },
    {
        mode: "dark" as Mode,
        label: "Dark",
        icon: "fa-moon",
        description: "Dark appearance"
    },
    {
        mode: "system" as Mode,
        label: "System",
        icon: "fa-display",
        description: "Match device setting"
    }
];

export default function ThemeToggle() {
    const [mode, setMode] = useState<Mode>("system");
    const [customTheme, setCustomTheme] = useState<ThemeName | undefined>(undefined);
    const [isOpen, setIsOpen] = useState(false);

    // init from storage
    useEffect(() => {
        const savedMode = (localStorage.getItem(STORAGE_KEY) as Mode) || "system";
        const savedTheme = (localStorage.getItem(STORAGE_THEME) as ThemeName) || undefined;
        setMode(savedMode);
        setCustomTheme(savedTheme);
        applyTheme(savedMode, savedTheme);
    }, []);

    // react to system changes when in system mode
    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        if (!mq) return;
        const handler = () => {
            if (mode === "system") applyTheme(mode, customTheme);
        };
        mq.addEventListener?.("change", handler);
        return () => mq.removeEventListener?.("change", handler);
    }, [mode, customTheme]);

    function setModeAndApply(next: Mode) {
        setMode(next);
        localStorage.setItem(STORAGE_KEY, next);
        // when picking light/dark/system, clear explicit theme
        setCustomTheme(undefined);
        localStorage.removeItem(STORAGE_THEME);
        applyTheme(next, undefined);
        setIsOpen(false);
    }


    const currentOption = themeOptions.find(option => option.mode === mode);

    return (
        <div className="relative">
            <HoverScale scale={1.05}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-9 h-9 rounded-lg bg-base-200/60 hover:bg-base-200 border border-base-300/40 flex items-center justify-center transition-all duration-200 group"
                    aria-label={`Current theme: ${currentOption?.label}. Click to change theme`}
                    title="Theme settings"
                >
                    <i className={`fa-duotone fa-solid ${currentOption?.icon} text-sm text-base-content/70 group-hover:text-base-content transition-colors`} aria-hidden />
                </button>
            </HoverScale>

            {/* Custom Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-base-100/95 backdrop-blur-sm rounded-2xl shadow-xl border border-base-200/60 p-3 animate-in slide-in-from-top-2 fade-in-0 duration-200">
                        <div className="space-y-1">
                            {/* Header */}
                            <div className="px-3 py-2 border-b border-base-200/60">
                                <h3 className="text-sm font-semibold text-base-content">Appearance</h3>
                                <p className="text-xs text-base-content/60">Choose your interface theme</p>
                            </div>

                            {/* Theme Options */}
                            <div className="space-y-1 py-2">
                                {themeOptions.map((option) => (
                                    <HoverScale key={option.mode} scale={1.01}>
                                        <button
                                            onClick={() => setModeAndApply(option.mode)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${mode === option.mode
                                                ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                                : "hover:bg-base-200/60 text-base-content/80 hover:text-base-content"
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${mode === option.mode
                                                ? "bg-primary/20 text-primary"
                                                : "bg-base-200/60 text-base-content/60"
                                                }`}>
                                                <i className={`fa-duotone fa-solid ${option.icon} text-sm`} aria-hidden />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{option.label}</div>
                                                <div className="text-xs opacity-60">{option.description}</div>
                                            </div>
                                            {mode === option.mode && (
                                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            )}
                                        </button>
                                    </HoverScale>
                                ))}
                            </div>

                            {/* Footer Info */}
                            <div className="px-3 py-2 border-t border-base-200/60">
                                <p className="text-xs text-base-content/50">
                                    {mode === "system"
                                        ? `Following ${systemPrefersDark() ? 'dark' : 'light'} system preference`
                                        : `Using ${mode} theme`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

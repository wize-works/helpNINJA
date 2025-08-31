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
    }

    function toggleTheme() {
        // Cycle through: light -> dark -> system -> light...
        const currentIndex = themeOptions.findIndex(option => option.mode === mode);
        const nextIndex = (currentIndex + 1) % themeOptions.length;
        const nextMode = themeOptions[nextIndex].mode;
        setModeAndApply(nextMode);
    }

    const currentOption = themeOptions.find(option => option.mode === mode);

    return (
        <HoverScale scale={1.05}>
            <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-lg bg-base-200/60 hover:bg-base-200 border border-base-300/40 flex items-center justify-center transition-all duration-200 group"
                aria-label={`Current theme: ${currentOption?.label}. Click to cycle to next theme`}
                title={`Theme: ${currentOption?.label} (click to cycle)`}
            >
                <i className={`fa-duotone fa-solid ${currentOption?.icon} text-sm text-base-content/70 group-hover:text-base-content transition-colors`} aria-hidden />
            </button>
        </HoverScale>
    );
}

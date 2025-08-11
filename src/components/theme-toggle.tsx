"use client";

import { useEffect, useState } from "react";

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

    document.documentElement.setAttribute("data-theme", final);
    // toggle dark class for Tailwind dark: utilities to play nice with DaisyUI
    document.documentElement.classList.toggle("dark", final === DARK_THEME);
    localStorage.setItem(STORAGE_THEME, final);
}

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

    function setExplicitTheme(t: ThemeName) {
        // choosing an explicit DaisyUI theme overrides light/dark mapping
        setCustomTheme(t);
        localStorage.setItem(STORAGE_THEME, t);
        // keep current mode (so user can still switch back to system later)
        applyTheme(mode, t);
    }

    return (
        <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm">
                <i
                    className={
                        {
                            light: "fa-duotone fa-solid fa-sun",
                            dark: "fa-duotone fa-solid fa-moon",
                            system: "fa-duotone fa-solid fa-desktop",
                        }[mode]
                    }
                    aria-hidden
                />
                <span className="ml-2 hidden sm:inline">Theme</span>
            </label>

            <div tabIndex={0} className="dropdown-content z-[100] w-56 rounded-box bg-base-100 p-2 shadow">
                {/* Mode group */}
                <div className="menu menu-sm rounded-box">
                    <div className="menu-title opacity-60">Mode</div>
                    <button className={`btn btn-ghost justify-start ${mode === "light" && "btn-active"}`} onClick={() => setModeAndApply("light")}>
                        <i className="fa-duotone fa-solid fa-sun mr-2" /> Light
                    </button>
                    <button className={`btn btn-ghost justify-start ${mode === "dark" && "btn-active"}`} onClick={() => setModeAndApply("dark")}>
                        <i className="fa-duotone fa-solid fa-moon mr-2" /> Dark
                    </button>
                    <button className={`btn btn-ghost justify-start ${mode === "system" && "btn-active"}`} onClick={() => setModeAndApply("system")}>
                        <i className="fa-duotone fa-solid fa-desktop mr-2" /> System
                    </button>
                </div>
            </div>
        </div>
    );
}

import "@/app/globals.css";
import Script from "next/script";
import { Suspense } from "react";
import Titlebar from "@/components/titlebar";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Clarity from "@/components/clarity";
import ConditionalFooter from "@/components/conditional-footer";

export { metadata, viewport } from "./metadata";

const themeInitializer = [
    "(function(){",
    "    const MODE_KEY = 'hn_theme_mode';",
    "    const THEME_KEY = 'hn_theme_name';",
    "    const FALLBACK_THEME = 'light';",
    "    try {",
    "        const storedMode = localStorage.getItem(MODE_KEY) || 'system';",
    "        const storedTheme = localStorage.getItem(THEME_KEY);",
    "        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;",
    "        let resolved = storedTheme || FALLBACK_THEME;",
    "        if (!storedTheme) {",
    "            if (storedMode === 'dark' || (storedMode === 'system' && prefersDark)) {",
    "                resolved = 'dark';",
    "            } else {",
    "                resolved = 'light';",
    "            }",
    "        }",
    "        document.documentElement.setAttribute('data-theme', resolved);",
    "        const isDark = typeof resolved === 'string' && resolved.toLowerCase().includes('dark');",
    "        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';",
    "    } catch (_) {",
    "        document.documentElement.setAttribute('data-theme', FALLBACK_THEME);",
    "        document.documentElement.style.colorScheme = 'light';",
    "    }",
    "})();"
].join("\n");

const fontAwesomeKitUrl = process.env.NEXT_PUBLIC_FONTAWESOME_KIT_URL || "https://kit.fontawesome.com/fab812572f.js";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="bg-base-100">
                <Script id="theme-initializer" strategy="beforeInteractive">
                    {themeInitializer}
                </Script>
                <Clarity />
                <ClerkProvider
                    signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/auth/signin"}
                    signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/auth/signup"}
                    signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/dashboard"}
                    signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/auth/signup"}
                >
                    <Suspense fallback={null}>
                        <Titlebar />
                    </Suspense>
                    <Suspense fallback={null}>
                        <main>{children}</main>
                    </Suspense>
                    <Suspense fallback={null}>
                        <ConditionalFooter />
                    </Suspense>
                </ClerkProvider>
                <Toaster
                    position="bottom-left"
                    toastOptions={{
                        duration: 4000,
                    }}
                />
                <Script src={fontAwesomeKitUrl} crossOrigin="anonymous" strategy="afterInteractive" />
            </body>
        </html>
    );
}
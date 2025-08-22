import "@/app/globals.css";
import Script from "next/script";
import { Suspense } from "react";
import Titlebar from "@/components/titlebar";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Clarity from "@/components/clarity";

export { metadata } from "./metadata";


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning data-theme="light">
            <Clarity />
            <body className="bg-base-100">
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
                </ClerkProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: 'hsl(var(--b1))',
                            color: 'hsl(var(--bc))',
                            border: '1px solid hsl(var(--b3))',
                        },
                        success: {
                            iconTheme: {
                                primary: 'hsl(var(--su))',
                                secondary: 'hsl(var(--suc))',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: 'hsl(var(--er))',
                                secondary: 'hsl(var(--erc))',
                            },
                        },
                    }}
                />
                <Script src="https://kit.fontawesome.com/fab812572f.js" crossOrigin="anonymous" />
            </body>
        </html>
    );
}
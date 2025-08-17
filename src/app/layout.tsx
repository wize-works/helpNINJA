import "@/app/globals.css";
import Script from "next/script";
import Titlebar from "@/components/titlebar";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import Clarity from "@/components/clarity";
import AuthDebugPanel from "@/components/debug/auth";


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning data-theme="light">
            <Clarity />
            <body className="bg-base-100">
                <ClerkProvider
                    signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in"}
                    signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up"}
                    signInFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/dashboard"}
                    signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/sign-up"}
                >
                    <Titlebar />
                    <main>{children}</main>
                    <AuthDebugPanel />
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
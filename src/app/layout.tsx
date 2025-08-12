import "@/app/globals.css";
import Script from "next/script";
import Titlebar from "@/components/titlebar";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className="">
            <body className="min-h-screen bg-base-100">
                <Titlebar />
                <main>{children}</main>
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
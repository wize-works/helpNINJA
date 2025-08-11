import "@/app/globals.css";
import Script from "next/script";
import Titlebar from "@/components/titlebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className="">
            <body className="min-h-screen bg-base-100">
                <Titlebar />
                <main>{children}</main>
                <Script src="https://kit.fontawesome.com/fab812572f.js" crossOrigin="anonymous" />
            </body>
        </html>
    );
}
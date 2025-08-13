import "@/app/globals.css";
import Script from "next/script";
import Titlebar from "@/components/titlebar";
import { Toaster } from "react-hot-toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning data-theme="light">
            <Script id="ms-clarity" strategy="afterInteractive">
                {`(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "stn8nnko3s");`}
            </Script>
            <body className="bg-base-100">
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
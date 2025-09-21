import Script from "next/script";

const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_ID;
const clarityFlag = process.env.NEXT_PUBLIC_ENABLE_CLARITY;
const clarityEnabled = !!clarityProjectId && (clarityFlag ? clarityFlag === "true" : process.env.NODE_ENV === "production");

export default function Clarity() {
    if (!clarityEnabled) return null;

    return (
        <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityProjectId}");`}
        </Script>
    );
}

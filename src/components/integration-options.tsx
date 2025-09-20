'use client';

import { useState } from 'react';
import { HoverScale } from '@/components/ui/animated-page';
import { toast } from '@/lib/toast';

type IntegrationTab = 'html' | 'nextjs' | 'react' | 'vue' | 'angular' | 'wordpress' | 'direct';

interface IntegrationOptionsProps {
    tenantPublicKey: string;
    siteId: string;
    verificationToken: string; // Renamed from scriptKey for clarity
    scriptKey?: string; // Keeping for backwards compatibility
    voice?: string;
    serviceUrl: string;
    fallbackCode?: string; // For backwards compatibility
    domain?: string; // Site domain for display in instructions
}

export default function IntegrationOptions({
    tenantPublicKey,
    siteId,
    verificationToken,
    scriptKey, // For backwards compatibility
    voice = 'friendly',
    serviceUrl,
    domain
}: IntegrationOptionsProps) {
    // Use verificationToken, fall back to scriptKey for backwards compatibility
    const token = verificationToken || scriptKey || '';
    const [activeTab, setActiveTab] = useState<IntegrationTab>('html');

    const copyToClipboard = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success({ message: 'Code copied to clipboard!' });
    };

    // Generate the various integration code options
    const htmlCode = `<!-- helpNINJA Chat Widget -->
<script>
  (function() {
    // Store configuration for client-side use
    window.helpNINJAConfig = {
      tenantId: "${tenantPublicKey}",
      siteId: "${siteId}",
      verificationToken: "${token}", // The verification token for site authentication
      voice: "${voice}"
    };
    var script = document.createElement("script");
    // Include necessary parameters in URL for server-side validation
    script.src = "${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${token}&voice=${voice}";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;

    const nextjsCode = `import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      
      {/* helpNINJA Widget */}
      <Script
        id="help-ninja-widget"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: \`
            (function() {
              // Store configuration for client-side use
              window.helpNINJAConfig = {
                tenantId: "${tenantPublicKey}",
                siteId: "${siteId}",
                verificationToken: "${token}", // The verification token for site authentication
                voice: "${voice}"
              };
              var script = document.createElement("script");
              // Include necessary parameters in URL for server-side validation
              script.src = "${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${token}&voice=${voice}";
              script.async = true;
              document.head.appendChild(script);
            })();
          \`
        }}
      />
    </>
  );
}`;

    const reactCode = `import { useEffect } from 'react';

function HelpNinjaWidget() {
  useEffect(() => {
    // Store configuration for client-side use
    window.helpNINJAConfig = {
      tenantId: "${tenantPublicKey}",
      siteId: "${siteId}",
      verificationToken: "${token}", // The verification token for site authentication
      voice: "${voice}"
    };

    // Create and load script with required parameters in URL
    const script = document.createElement("script");
    script.src = "${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${token}&voice=${voice}";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Optional: Remove script on unmount (using partial match since URL has parameters)
      const existingScript = document.querySelector('script[src^="${serviceUrl}/api/widget"]');
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

  return null;
}

// Use in your app component:
// <HelpNinjaWidget />`;

    const vueCode = `<!-- In your App.vue or a layout component -->
<template>
  <div>
    <!-- Your app content -->
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    // Store configuration for client-side use
    window.helpNINJAConfig = {
      tenantId: "${tenantPublicKey}",
      siteId: "${siteId}",
      verificationToken: "${token}", // The verification token for site authentication
      voice: "${voice}"
    };

    // Create and load script with required parameters in URL
    const script = document.createElement("script");
    script.src = "${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${token}&voice=${voice}";
    script.async = true;
    document.head.appendChild(script);
  }
}
</script>`;

    const angularCode = `import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  ngOnInit() {
    // Store configuration for client-side use
    (window as any).helpNINJAConfig = {
      tenantId: "${tenantPublicKey}",
      siteId: "${siteId}",
      verificationToken: "${token}", // The verification token for site authentication
      voice: "${voice}"
    };

    // Create and load script with required parameters in URL
    const script = document.createElement("script");
    script.src = "${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${token}&voice=${voice}";
    script.async = true;
    document.head.appendChild(script);
  }
}`;

    const wordpressCode = `/**
 * Add helpNINJA Chat Widget
 */
function add_helpninja_widget() {
    ?>
    <!-- helpNINJA Chat Widget -->
    <script>
      (function() {
        // Store configuration for client-side use
        window.helpNINJAConfig = {
          tenantId: "<?php echo '${tenantPublicKey}'; ?>",
          siteId: "<?php echo '${siteId}'; ?>",
          verificationToken: "<?php echo '${token}'; ?>", // The verification token for site authentication
          voice: "<?php echo '${voice}'; ?>"
        };
        var script = document.createElement("script");
        script.src = "<?php echo '${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${token}&voice=${voice}'; ?>";
        script.async = true;
        document.head.appendChild(script);
      })();
    </script>
    <?php
}
add_action('wp_footer', 'add_helpninja_widget');

// Add this code to your theme's functions.php file`;

    const directLinkCode = `<script async src="${serviceUrl}/api/widget?t=${tenantPublicKey}&s=${siteId}&k=${encodeURIComponent(token)}&voice=${voice}"></script>
<!-- Note: The 'k' parameter uses the verification token, not the script key -->`;

    // Get the current tab's code
    const getActiveCode = () => {
        switch (activeTab) {
            case 'html': return htmlCode;
            case 'nextjs': return nextjsCode;
            case 'react': return reactCode;
            case 'vue': return vueCode;
            case 'angular': return angularCode;
            case 'wordpress': return wordpressCode;
            case 'direct': return directLinkCode;
            default: return htmlCode;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 pb-2 border-b border-base-200/60">
                <button
                    onClick={() => setActiveTab('html')}
                    className={`btn btn-sm ${activeTab === 'html' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">HTML</span>
                </button>
                <button
                    onClick={() => setActiveTab('nextjs')}
                    className={`btn btn-sm ${activeTab === 'nextjs' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">Next.js</span>
                </button>
                <button
                    onClick={() => setActiveTab('react')}
                    className={`btn btn-sm ${activeTab === 'react' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">React</span>
                </button>
                <button
                    onClick={() => setActiveTab('vue')}
                    className={`btn btn-sm ${activeTab === 'vue' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">Vue</span>
                </button>
                <button
                    onClick={() => setActiveTab('angular')}
                    className={`btn btn-sm ${activeTab === 'angular' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">Angular</span>
                </button>
                <button
                    onClick={() => setActiveTab('wordpress')}
                    className={`btn btn-sm ${activeTab === 'wordpress' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">WordPress</span>
                </button>
                <button
                    onClick={() => setActiveTab('direct')}
                    className={`btn btn-sm ${activeTab === 'direct' ? 'btn-primary' : 'btn-ghost'} rounded-lg`}
                >
                    <span className="text-xs">Direct Link</span>
                </button>
            </div>

            <div className="bg-base-200 rounded-xl p-4 relative">
                <pre className="text-xs overflow-x-auto text-base-content/80 max-h-64">
                    <code>{getActiveCode()}</code>
                </pre>
                <HoverScale scale={1.05}>
                    <button
                        onClick={() => copyToClipboard(getActiveCode())}
                        className="absolute top-2 right-2 btn btn-sm btn-primary btn-outline rounded-lg"
                        aria-label="Copy to clipboard"
                    >
                        <i className="fa-duotone fa-solid fa-copy" aria-hidden />
                    </button>
                </HoverScale>
            </div>

            <div className="bg-gradient-to-r from-info/10 to-info/5 border border-info/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <i className="fa-duotone fa-solid fa-circle-info text-info mt-0.5" aria-hidden />
                    <div>
                        <h4 className="font-medium text-sm">Integration Notes</h4>
                        {activeTab === 'nextjs' && (
                            <p className="text-sm text-base-content/70 mt-1">
                                For Next.js projects, place this code in your root layout component. Make sure to use the <code className="bg-base-300/50 px-1 rounded">next/script</code> component with <code className="bg-base-300/50 px-1 rounded">strategy=&quot;afterInteractive&quot;</code>.
                            </p>
                        )}
                        {activeTab === 'react' && (
                            <p className="text-sm text-base-content/70 mt-1">
                                For React projects, create a component as shown and include it in your main App component or layout component. The cleanup function ensures the script is removed when the component unmounts.
                            </p>
                        )}
                        {activeTab === 'vue' && (
                            <p className="text-sm text-base-content/70 mt-1">
                                For Vue projects, add this code to your App.vue file or a layout component that&apos;s present on all pages. The widget will be initialized in the <code className="bg-base-300/50 px-1 rounded">mounted</code> lifecycle hook.
                            </p>
                        )}
                        {activeTab === 'angular' && (
                            <p className="text-sm text-base-content/70 mt-1">
                                For Angular projects, add this code to your main AppComponent. The widget will be initialized in the <code className="bg-base-300/50 px-1 rounded">ngOnInit</code> lifecycle hook.
                            </p>
                        )}
                        {activeTab === 'wordpress' && (
                            <p className="text-sm text-base-content/70 mt-1">
                                Add this code to your theme&apos;s functions.php file. It will add the widget script to the footer of all pages on your WordPress site.
                            </p>
                        )}
                        {activeTab === 'html' && (
                            <div className="text-sm text-base-content/70 mt-1">
                                <p>For HTML sites, add this script just before the closing <code className="bg-base-300/50 px-1 rounded">&lt;/body&gt;</code> tag. This will add the helpNINJA widget to your site.</p>
                                <p className="mt-1 text-warning font-medium"><i className="fa-duotone fa-solid fa-triangle-exclamation mr-1" aria-hidden />Important: Make sure to embed this on the exact domain you registered{domain ? ` (${domain})` : ''}. Domain verification is strict and will not work on other domains or subdomains.</p>
                            </div>
                        )}
                        {activeTab === 'direct' && (
                            <p className="text-sm text-base-content/70 mt-1">
                                For simple integration, use this direct script tag. Add it just before the closing <code className="bg-base-300/50 px-1 rounded">&lt;/body&gt;</code> tag in your HTML.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

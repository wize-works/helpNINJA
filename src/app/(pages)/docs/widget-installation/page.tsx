import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Widget Installation - helpNINJA Help Center',
    description: 'Step-by-step guide to install and configure the helpNINJA chat widget on your website.',
};

export default function WidgetInstallationPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-base-content mb-4">
                    Widget Installation Guide
                </h1>
                <p className="text-xl text-base-content/70">
                    Learn how to install and customize the helpNINJA chat widget on your website in just a few minutes.
                </p>
            </div>

            {/* Overview */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Overview</h2>
                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-4">
                        The helpNINJA chat widget is a lightweight, customizable component that adds AI-powered customer support to any website.
                        Installation takes just a few minutes and requires only basic HTML knowledge.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-bolt text-yellow-500"></i></div>
                            <div className="font-semibold">Fast Setup</div>
                            <div className="text-sm text-base-content/60">Under 5 minutes</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-palette text-purple-500"></i></div>
                            <div className="font-semibold">Fully Customizable</div>
                            <div className="text-sm text-base-content/60">Match your brand</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-mobile text-blue-500"></i></div>
                            <div className="font-semibold">Mobile Ready</div>
                            <div className="text-sm text-base-content/60">Works everywhere</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Step 1: Get Widget Code */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Step 1: Get Your Widget Code</h2>

                <div className="steps steps-vertical lg:steps-horizontal mb-6">
                    <div className="step step-primary">Login to Dashboard</div>
                    <div className="step step-primary">Configure Widget</div>
                    <div className="step">Copy Code</div>
                    <div className="step">Add to Website</div>
                </div>

                <ol className="list-decimal list-inside space-y-4 text-base-content/80">
                    <li>
                        <strong>Login to your helpNINJA dashboard</strong> at{' '}
                        <Link href="/dashboard" className="text-primary hover:underline">
                            dashboard
                        </Link>
                    </li>
                    <li>
                        <strong>Navigate to Widget Settings</strong> in the sidebar or go to{' '}
                        <strong>Sites → [Your Site] → Configure</strong>
                    </li>
                    <li>
                        <strong>Customize your widget</strong> appearance, behavior, and content using the real-time preview
                    </li>
                    <li>
                        <strong>Copy the installation code</strong> from the &quot;Installation&quot; tab
                    </li>
                </ol>

                <div className="alert alert-info mt-6">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Each site in your account gets its own unique widget code. Make sure you&apos;re using the correct code for each domain.</span>
                </div>
            </section>

            {/* Step 2: Installation */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Step 2: Add Code to Your Website</h2>

                <div className="steps steps-vertical lg:steps-horizontal mb-6">
                    <div className="step step-primary">Login to Dashboard</div>
                    <div className="step step-primary">Configure Widget</div>
                    <div className="step step-primary">Copy Code</div>
                    <div className="step">Add to Website</div>
                </div>

                <p className="text-base-content/80 mb-6">
                    Add the widget code to your website by placing it just before the closing <code className="bg-base-300 px-2 py-1 rounded">&lt;/body&gt;</code> tag
                    on every page where you want the chat widget to appear.
                </p>

                <div className="tabs tabs-boxed mb-6">
                    <a className="tab tab-active">HTML</a>
                    <a className="tab">WordPress</a>
                    <a className="tab">Shopify</a>
                    <a className="tab">React/Next.js</a>
                </div>

                {/* HTML Installation */}
                <div className="mockup-code mb-6">
                    <pre data-prefix="1"><code>&lt;!-- Add this before closing &lt;/body&gt; tag --&gt;</code></pre>
                    <pre data-prefix="2"><code>&lt;script&gt;</code></pre>
                    <pre data-prefix="3"><code>  window.helpNINJAConfig = &#123;</code></pre>
                    <pre data-prefix="4"><code>    tenantId: &quot;pk_your_tenant_id_here&quot;,</code></pre>
                    <pre data-prefix="5"><code>    siteId: &quot;your_site_id_here&quot;,</code></pre>
                    <pre data-prefix="6"><code>    verificationToken: &quot;your_verification_token&quot;</code></pre>
                    <pre data-prefix="7"><code>  &#125;;</code></pre>
                    <pre data-prefix="8"><code>&lt;/script&gt;</code></pre>
                    <pre data-prefix="9"><code>&lt;script src=&quot;https://helpninja.app/api/widget&quot; async&gt;&lt;/script&gt;</code></pre>
                </div>

                <div className="alert alert-warning mb-6">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <span>Replace the placeholder values with your actual tenant ID, site ID, and verification token from the dashboard.</span>
                </div>

                {/* Platform-specific instructions */}
                <div className="collapse collapse-arrow bg-base-200 mb-4">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">
                        WordPress Installation
                    </div>
                    <div className="collapse-content">
                        <ol className="list-decimal list-inside space-y-2">
                            <li>Go to your WordPress admin dashboard</li>
                            <li>Navigate to <strong>Appearance → Theme Editor</strong> or use a plugin like <strong>Insert Headers and Footers</strong></li>
                            <li>Add the widget code to your theme&apos;s <code>footer.php</code> file before <code>&lt;/body&gt;</code></li>
                            <li>Save the changes</li>
                        </ol>
                        <div className="alert alert-info mt-4">
                            <span>For easier management, consider using a plugin like &quot;Insert Headers and Footers&quot; or &quot;Code Snippets&quot; to add the widget code.</span>
                        </div>
                    </div>
                </div>

                <div className="collapse collapse-arrow bg-base-200 mb-4">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">
                        Shopify Installation
                    </div>
                    <div className="collapse-content">
                        <ol className="list-decimal list-inside space-y-2">
                            <li>In your Shopify admin, go to <strong>Online Store → Themes</strong></li>
                            <li>Click <strong>Actions → Edit Code</strong> on your active theme</li>
                            <li>Open the <code>theme.liquid</code> file</li>
                            <li>Add the widget code just before the closing <code>&lt;/body&gt;</code> tag</li>
                            <li>Save the file</li>
                        </ol>
                    </div>
                </div>

                <div className="collapse collapse-arrow bg-base-200">
                    <input type="checkbox" />
                    <div className="collapse-title text-lg font-medium">
                        React/Next.js Installation
                    </div>
                    <div className="collapse-content">
                        <p className="mb-4">For React applications, you can either add the script to your HTML template or load it dynamically:</p>
                        <div className="mockup-code">
                            <pre data-prefix="1"><code>{`// Add to _document.tsx (Next.js) or index.html`}</code></pre>
                            <pre data-prefix="2"><code>useEffect(() =&gt; &#123;</code></pre>
                            <pre data-prefix="3"><code>  window.helpNINJAConfig = &#123;</code></pre>
                            <pre data-prefix="4"><code>    tenantId: &quot;pk_your_tenant_id&quot;,</code></pre>
                            <pre data-prefix="5"><code>    siteId: &quot;your_site_id&quot;,</code></pre>
                            <pre data-prefix="6"><code>    verificationToken: &quot;your_token&quot;</code></pre>
                            <pre data-prefix="7"><code>  &#125;;</code></pre>
                            <pre data-prefix="8"><code>  const script = document.createElement(&apos;script&apos;);</code></pre>
                            <pre data-prefix="9"><code>  script.src = &apos;https://helpninja.app/api/widget&apos;;</code></pre>
                            <pre data-prefix="10"><code>  script.async = true;</code></pre>
                            <pre data-prefix="11"><code>  document.body.appendChild(script);</code></pre>
                            <pre data-prefix="12"><code>&#125;, []);</code></pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* Step 3: Customization */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Step 3: Customize Your Widget</h2>

                <div className="steps steps-vertical lg:steps-horizontal mb-6">
                    <div className="step step-primary">Login to Dashboard</div>
                    <div className="step step-primary">Configure Widget</div>
                    <div className="step step-primary">Copy Code</div>
                    <div className="step step-primary">Add to Website</div>
                </div>

                <p className="text-base-content/80 mb-6">
                    You can customize your widget&apos;s appearance and behavior either through the dashboard or by adding configuration options to your code.
                </p>

                <h3 className="text-xl font-semibold mb-4">Dashboard Customization</h3>
                <p className="text-base-content/80 mb-4">
                    The easiest way to customize your widget is through the dashboard&apos;s real-time configuration interface:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card bg-base-200">
                        <div className="card-body text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-palette text-purple-500"></i></div>
                            <h4 className="font-semibold">Appearance</h4>
                            <p className="text-sm text-base-content/60">Colors, themes, positioning, and icons</p>
                        </div>
                    </div>
                    <div className="card bg-base-200">
                        <div className="card-body text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-gear text-blue-500"></i></div>
                            <h4 className="font-semibold">Behavior</h4>
                            <p className="text-sm text-base-content/60">Auto-open, animations, and interactions</p>
                        </div>
                    </div>
                    <div className="card bg-base-200">
                        <div className="card-body text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-comments text-green-500"></i></div>
                            <h4 className="font-semibold">Content</h4>
                            <p className="text-sm text-base-content/60">Welcome messages, AI name, and voice</p>
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-semibold mb-4">Code Customization</h3>
                <p className="text-base-content/80 mb-4">
                    For advanced customization, you can add configuration options directly to your widget code:
                </p>

                <div className="mockup-code mb-6">
                    <pre data-prefix="1"><code>window.helpNINJAConfig = &#123;</code></pre>
                    <pre data-prefix="2"><code>{`  // Required`}</code></pre>
                    <pre data-prefix="3"><code>  tenantId: &quot;pk_your_tenant_id&quot;,</code></pre>
                    <pre data-prefix="4"><code>  siteId: &quot;your_site_id&quot;,</code></pre>
                    <pre data-prefix="5"><code>  verificationToken: &quot;your_token&quot;,</code></pre>
                    <pre data-prefix="6"><code></code></pre>
                    <pre data-prefix="7"><code>{`  // Appearance`}</code></pre>
                    <pre data-prefix="8"><code>  theme: &quot;auto&quot;,                    // &quot;light&quot;, &quot;dark&quot;, &quot;auto&quot;</code></pre>
                    <pre data-prefix="9"><code>  primaryColor: &quot;#7C3AED&quot;,          // Your brand color</code></pre>
                    <pre data-prefix="10"><code>  position: &quot;bottom-right&quot;,         // &quot;bottom-left&quot;, &quot;bottom-right&quot;</code></pre>
                    <pre data-prefix="11"><code>  buttonIcon: &quot;logo&quot;,               // &quot;logo&quot;, &quot;chat&quot;, &quot;help&quot;, &quot;message&quot;</code></pre>
                    <pre data-prefix="12"><code></code></pre>
                    <pre data-prefix="13"><code>{`  // Behavior`}</code></pre>
                    <pre data-prefix="14"><code>  autoOpenDelay: 0,                // Auto-open delay in ms (0 = disabled)</code></pre>
                    <pre data-prefix="15"><code>  showBranding: true,              // Show &quot;Powered by helpNINJA&quot;</code></pre>
                    <pre data-prefix="16"><code></code></pre>
                    <pre data-prefix="17"><code>{`  // Content`}</code></pre>
                    <pre data-prefix="18"><code>  welcomeMessage: &quot;Hi! How can I help?&quot;,</code></pre>
                    <pre data-prefix="19"><code>  aiName: &quot;AI Assistant&quot;,</code></pre>
                    <pre data-prefix="20"><code>  voice: &quot;friendly&quot;                // &quot;friendly&quot;, &quot;professional&quot;, &quot;casual&quot;</code></pre>
                    <pre data-prefix="21"><code>&#125;;</code></pre>
                </div>
            </section>

            {/* Step 4: Testing */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Step 4: Test Your Installation</h2>

                <p className="text-base-content/80 mb-6">
                    After installing the widget, verify that everything is working correctly:
                </p>

                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-bold">1</div>
                        <div>
                            <strong>Check Widget Appearance</strong>
                            <p className="text-base-content/60">Visit your website and confirm the chat button appears in the correct position with your chosen styling.</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-bold">2</div>
                        <div>
                            <strong>Test Chat Functionality</strong>
                            <p className="text-base-content/60">Click the chat button and send a test message to ensure the AI responds correctly.</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-bold">3</div>
                        <div>
                            <strong>Verify Dashboard Tracking</strong>
                            <p className="text-base-content/60">Check your dashboard to confirm conversations are being tracked and analytics are updating.</p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-content text-sm font-bold">4</div>
                        <div>
                            <strong>Test on Mobile</strong>
                            <p className="text-base-content/60">Verify the widget works correctly on mobile devices and different screen sizes.</p>
                        </div>
                    </div>
                </div>

                <div className="alert alert-success mt-6">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>
                        <strong>Congratulations!</strong> Your helpNINJA widget is now live and ready to help your customers.
                    </span>
                </div>
            </section>

            {/* Advanced Features */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Advanced Features</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title">Programmatic Control</h3>
                            <p className="text-base-content/70">Control the widget with JavaScript:</p>
                            <div className="mockup-code text-xs mt-4">
                                <pre><code>{`// Open the widget`}</code></pre>
                                <pre><code>window.helpNINJA.open();</code></pre>
                                <pre><code></code></pre>
                                <pre><code>{`// Send a message`}</code></pre>
                                <pre><code>window.helpNINJA.sendMessage(&quot;Hello!&quot;);</code></pre>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title">Page Context</h3>
                            <p className="text-base-content/70">Provide context for better AI responses:</p>
                            <div className="mockup-code text-xs mt-4">
                                <pre><code>pageContext: &#123;</code></pre>
                                <pre><code>  title: document.title,</code></pre>
                                <pre><code>  url: window.location.href,</code></pre>
                                <pre><code>  section: &quot;pricing&quot;</code></pre>
                                <pre><code>&#125;</code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Troubleshooting */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Troubleshooting</h2>

                <div className="space-y-4">
                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Widget not appearing on my website
                        </div>
                        <div className="collapse-content">
                            <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                <li>Verify the script is placed before the closing <code>&lt;/body&gt;</code> tag</li>
                                <li>Check that your tenant ID, site ID, and verification token are correct</li>
                                <li>Ensure your domain is verified in the dashboard</li>
                                <li>Check browser console for any JavaScript errors</li>
                            </ul>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Chat not responding to messages
                        </div>
                        <div className="collapse-content">
                            <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                <li>Check if you&apos;ve reached your plan&apos;s message limit</li>
                                <li>Verify your knowledge base has content for the AI to reference</li>
                                <li>Ensure your account is active and in good standing</li>
                                <li>Try refreshing the page and sending a new message</li>
                            </ul>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Widget styling doesn&apos;t match my website
                        </div>
                        <div className="collapse-content">
                            <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                <li>Use the dashboard&apos;s appearance settings to adjust colors and themes</li>
                                <li>Add custom CSS to override specific styles if needed</li>
                                <li>Consider setting the theme to &quot;auto&quot; to match user preferences</li>
                                <li>Contact support for advanced styling assistance</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Next Steps */}
            <section>
                <h2 className="text-2xl font-bold text-base-content mb-4">Next Steps</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/docs/dashboard" className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-chart-line text-blue-500 mr-2"></i>Explore the Dashboard</h3>
                            <p className="text-base-content/70">
                                Learn how to use analytics, manage conversations, and optimize your AI assistant.
                            </p>
                        </div>
                    </Link>

                    <Link href="/docs/integrations" className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-link text-purple-500 mr-2"></i>Set Up Integrations</h3>
                            <p className="text-base-content/70">
                                Connect Slack, email, and other tools for seamless escalations and notifications.
                            </p>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}
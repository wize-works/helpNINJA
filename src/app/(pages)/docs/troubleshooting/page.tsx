import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Troubleshooting Guide - helpNINJA Help Center',
    description: 'Common issues and solutions for helpNINJA users. Get help with widget installation, chat problems, integrations, and more.',
};

export default function TroubleshootingPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-base-content mb-4">
                    Troubleshooting Guide
                </h1>
                <p className="text-xl text-base-content/70">
                    Find solutions to common issues and learn how to optimize your helpNINJA setup for the best performance.
                </p>
            </div>

            {/* Quick Solutions */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-triangle-exclamation text-red-500 mr-2"></i>Quick Solutions</h2>
                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-6">
                        Try these common solutions first before diving into detailed troubleshooting steps.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="card bg-base-100">
                            <div className="card-body text-center">
                                <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-sync text-blue-500"></i></div>
                                <h4 className="font-semibold">Refresh & Retry</h4>
                                <p className="text-sm text-base-content/60">Clear cache and reload the page</p>
                            </div>
                        </div>
                        <div className="card bg-base-100">
                            <div className="card-body text-center">
                                <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-magnifying-glass text-purple-500"></i></div>
                                <h4 className="font-semibold">Check Browser Console</h4>
                                <p className="text-sm text-base-content/60">Look for JavaScript errors (F12)</p>
                            </div>
                        </div>
                        <div className="card bg-base-100">
                            <div className="card-body text-center">
                                <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-chart-line text-green-500"></i></div>
                                <h4 className="font-semibold">Verify Usage Limits</h4>
                                <p className="text-sm text-base-content/60">Check if you&apos;ve exceeded plan limits</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Widget Issues */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-wrench text-orange-500 mr-2"></i>Widget Installation Issues</h2>

                <div className="space-y-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-error"><i className="fa-duotone fa-solid fa-xmark text-red-500 mr-2"></i>Widget not appearing on website</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Common Causes & Solutions:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Script placement:</strong> Ensure the widget script is placed just before the closing <code className="bg-base-300 px-1 rounded">&lt;/body&gt;</code> tag
                                        </li>
                                        <li>
                                            <strong>Invalid credentials:</strong> Double-check your tenant ID, site ID, and verification token in the dashboard
                                        </li>
                                        <li>
                                            <strong>Domain verification:</strong> Verify your domain is properly configured in Dashboard → Sites
                                        </li>
                                        <li>
                                            <strong>JavaScript errors:</strong> Check browser console (F12) for any error messages
                                        </li>
                                        <li>
                                            <strong>Content blockers:</strong> Ad blockers or privacy extensions may block the widget
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-base-100 p-4 rounded">
                                    <h5 className="font-semibold mb-2">Debugging Steps:</h5>
                                    <ol className="list-decimal list-inside space-y-1 text-base-content/70">
                                        <li>Open browser developer tools (F12)</li>
                                        <li>Check the Console tab for any red error messages</li>
                                        <li>Look in the Network tab to verify the widget script loads successfully</li>
                                        <li>Confirm the widget configuration object is properly set</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-warning"><i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>Widget appears but styling is broken</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Possible Solutions:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>CSS conflicts:</strong> Your website&apos;s CSS may be overriding widget styles
                                        </li>
                                        <li>
                                            <strong>Z-index issues:</strong> Adjust widget position or increase z-index in configuration
                                        </li>
                                        <li>
                                            <strong>Theme compatibility:</strong> Try switching between light/dark themes
                                        </li>
                                        <li>
                                            <strong>Custom CSS:</strong> Add specific CSS rules to fix styling conflicts
                                        </li>
                                    </ul>
                                </div>

                                <div className="mockup-code text-sm">
                                    <pre data-prefix="CSS"><code>{`/* Fix common styling conflicts */`}</code></pre>
                                    <pre data-prefix=""><code>.helpninja-widget &#123;</code></pre>
                                    <pre data-prefix=""><code>  z-index: 9999 !important;</code></pre>
                                    <pre data-prefix=""><code>  font-family: inherit !important;</code></pre>
                                    <pre data-prefix=""><code>&#125;</code></pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-info">ℹ️ Widget loads slowly or inconsistently</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Performance Optimization:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Async loading:</strong> Ensure the <code className="bg-base-300 px-1 rounded">async</code> attribute is present on the script tag
                                        </li>
                                        <li>
                                            <strong>Network conditions:</strong> Slow internet may delay widget initialization
                                        </li>
                                        <li>
                                            <strong>Page load timing:</strong> Widget loads after page content, which is normal
                                        </li>
                                        <li>
                                            <strong>Server location:</strong> CDN automatically serves from nearest location
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chat & AI Issues */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">🤖 Chat & AI Issues</h2>

                <div className="space-y-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-error"><i className="fa-duotone fa-solid fa-xmark text-red-500 mr-2"></i>AI not responding to messages</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Check These Issues:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Usage limits:</strong> You may have exceeded your monthly message limit
                                        </li>
                                        <li>
                                            <strong>Knowledge base:</strong> Ensure you have uploaded content for the AI to reference
                                        </li>
                                        <li>
                                            <strong>Account status:</strong> Verify your subscription is active and payments are current
                                        </li>
                                        <li>
                                            <strong>Service status:</strong> Check our status page for any ongoing issues
                                        </li>
                                        <li>
                                            <strong>Network connectivity:</strong> Ensure stable internet connection
                                        </li>
                                    </ul>
                                </div>

                                <div className="alert alert-info">
                                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>Check your dashboard&apos;s usage meter to see if you&apos;ve hit your plan&apos;s message limit.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-warning"><i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>AI responses are irrelevant or unhelpful</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Improve AI Performance:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Content quality:</strong> Upload comprehensive, well-structured documentation
                                        </li>
                                        <li>
                                            <strong>Content organization:</strong> Use clear headings and logical document structure
                                        </li>
                                        <li>
                                            <strong>Content freshness:</strong> Regularly update outdated information
                                        </li>
                                        <li>
                                            <strong>Testing queries:</strong> Test common customer questions in the dashboard
                                        </li>
                                        <li>
                                            <strong>Feedback loop:</strong> Monitor escalated conversations for improvement opportunities</li>
                                    </ul>
                                </div>

                                <div className="bg-base-100 p-4 rounded">
                                    <h5 className="font-semibold mb-2">Content Best Practices:</h5>
                                    <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                        <li>Use FAQ format for common questions</li>
                                        <li>Include step-by-step instructions</li>
                                        <li>Add context and examples</li>
                                        <li>Keep content concise but comprehensive</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-info">ℹ️ Messages taking too long to send</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Response Time Issues:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>High traffic:</strong> Response times may increase during peak usage
                                        </li>
                                        <li>
                                            <strong>Complex queries:</strong> Longer messages take more time to process
                                        </li>
                                        <li>
                                            <strong>Knowledge base size:</strong> Larger content libraries may slow responses
                                        </li>
                                        <li>
                                            <strong>Network latency:</strong> Geographic distance affects response times
                                        </li>
                                    </ul>
                                </div>

                                <div className="stat bg-base-100 rounded-lg">
                                    <div className="stat-title">Typical Response Times</div>
                                    <div className="stat-value text-primary">1-3s</div>
                                    <div className="stat-desc">Average AI response time</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Integration Issues */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-link text-purple-500 mr-2"></i>Integration Issues</h2>

                <div className="space-y-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-error"><i className="fa-duotone fa-solid fa-xmark text-red-500 mr-2"></i>Slack/Teams/Discord not receiving notifications</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Integration Troubleshooting:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Webhook URL:</strong> Verify the webhook URL is correct and hasn&apos;t expired
                                        </li>
                                        <li>
                                            <strong>Channel permissions:</strong> Ensure the webhook has permission to post in the channel
                                        </li>
                                        <li>
                                            <strong>Integration status:</strong> Check integration status in Dashboard → Integrations
                                        </li>
                                        <li>
                                            <strong>Test messages:</strong> Use the &quot;Send Test Message&quot; feature
                                        </li>
                                        <li>
                                            <strong>Escalation rules:</strong> Verify escalation rules are properly configured
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-base-100 p-4 rounded">
                                    <h5 className="font-semibold mb-2">Testing Steps:</h5>
                                    <ol className="list-decimal list-inside space-y-1 text-base-content/70">
                                        <li>Go to Dashboard → Integrations</li>
                                        <li>Find your integration and click &quot;Configure&quot;</li>
                                        <li>Click &quot;Send Test Message&quot;</li>
                                        <li>Check your channel for the test notification</li>
                                        <li>If test fails, verify webhook URL and permissions</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-warning"><i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>Too many or too few escalation notifications</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Adjust Escalation Settings:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Confidence threshold:</strong> Adjust the confidence level trigger (default: 55%)
                                        </li>
                                        <li>
                                            <strong>Keyword filters:</strong> Refine keyword-based escalation rules
                                        </li>
                                        <li>
                                            <strong>Rate limiting:</strong> Set up notification frequency limits
                                        </li>
                                        <li>
                                            <strong>Business hours:</strong> Configure time-based escalation rules
                                        </li>
                                        <li>
                                            <strong>Rule priority:</strong> Order rules by importance</li>
                                    </ul>
                                </div>

                                <div className="bg-base-100 p-4 rounded">
                                    <h5 className="font-semibold mb-2">Recommended Confidence Thresholds:</h5>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <strong>Conservative:</strong> 70%
                                            <div className="text-base-content/60">Fewer escalations</div>
                                        </div>
                                        <div>
                                            <strong>Balanced:</strong> 55%
                                            <div className="text-base-content/60">Default setting</div>
                                        </div>
                                        <div>
                                            <strong>Aggressive:</strong> 40%
                                            <div className="text-base-content/60">More escalations</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-info">ℹ️ Dashboard links in notifications not working</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Link Troubleshooting:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Domain configuration:</strong> Verify your helpNINJA domain is set correctly
                                        </li>
                                        <li>
                                            <strong>User permissions:</strong> Ensure team members have dashboard access
                                        </li>
                                        <li>
                                            <strong>Session management:</strong> Users may need to sign in to access conversations
                                        </li>
                                        <li>
                                            <strong>Network access:</strong> Check if corporate firewalls block access
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Account & Billing Issues */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-credit-card text-blue-500 mr-2"></i>Account & Billing Issues</h2>

                <div className="space-y-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-error"><i className="fa-duotone fa-solid fa-xmark text-red-500 mr-2"></i>Can&apos;t access dashboard or features are limited</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Access Issues:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Payment status:</strong> Check if your subscription payment is current
                                        </li>
                                        <li>
                                            <strong>Plan limits:</strong> Verify you haven&apos;t exceeded your plan&apos;s features
                                        </li>
                                        <li>
                                            <strong>User permissions:</strong> Ensure your account has the necessary role permissions
                                        </li>
                                        <li>
                                            <strong>Browser issues:</strong> Try clearing cookies or using an incognito window
                                        </li>
                                    </ul>
                                </div>

                                <div className="alert alert-warning">
                                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                    </svg>
                                    <span>If payment failed, update your payment method in billing settings to restore full access.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-warning"><i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>Unexpected billing charges or usage</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Billing Investigation:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Usage analytics:</strong> Review detailed usage breakdown in Dashboard → Analytics
                                        </li>
                                        <li>
                                            <strong>Overage charges:</strong> Check if you exceeded your plan&apos;s message limits
                                        </li>
                                        <li>
                                            <strong>Plan changes:</strong> Verify any recent plan upgrades or changes
                                        </li>
                                        <li>
                                            <strong>Billing cycle:</strong> Understand your billing date and prorations
                                        </li>
                                        <li>
                                            <strong>Invoice details:</strong> Download detailed invoices for line-item breakdown
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-base-100 p-4 rounded">
                                    <h5 className="font-semibold mb-2">Common Billing Scenarios:</h5>
                                    <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                        <li>Overage charges when exceeding message limits</li>
                                        <li>Prorated charges when upgrading mid-cycle</li>
                                        <li>Annual billing discounts vs monthly charges</li>
                                        <li>Tax calculations based on location</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Performance Issues */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-bolt text-yellow-500 mr-2"></i>Performance Issues</h2>

                <div className="space-y-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-warning"><i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>Dashboard loading slowly</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Performance Optimization:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Browser cache:</strong> Clear browser cache and cookies
                                        </li>
                                        <li>
                                            <strong>Network speed:</strong> Check your internet connection speed
                                        </li>
                                        <li>
                                            <strong>Browser choice:</strong> Try a different browser (Chrome, Firefox, Safari)
                                        </li>
                                        <li>
                                            <strong>Extensions:</strong> Disable browser extensions that might interfere
                                        </li>
                                        <li>
                                            <strong>Data volume:</strong> Large datasets may slow down analytics pages
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title text-info">ℹ️ Analytics not updating or showing incorrect data</h3>

                            <div className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Data Sync Issues:</h4>
                                    <ul className="list-disc list-inside space-y-2 text-base-content/80">
                                        <li>
                                            <strong>Data refresh:</strong> Analytics update every few minutes, not real-time
                                        </li>
                                        <li>
                                            <strong>Timezone settings:</strong> Verify your account timezone settings
                                        </li>
                                        <li>
                                            <strong>Date range:</strong> Check the selected date range in analytics
                                        </li>
                                        <li>
                                            <strong>Browser refresh:</strong> Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
                                        </li>
                                    </ul>
                                </div>

                                <div className="stat bg-base-100 rounded-lg">
                                    <div className="stat-title">Data Update Frequency</div>
                                    <div className="stat-value text-primary">5 min</div>
                                    <div className="stat-desc">Analytics refresh interval</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Getting Help */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">🆘 Getting Help</h2>

                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-6">
                        If you can&apos;t find a solution in this guide, our support team is here to help you get back on track.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="card bg-base-100">
                            <div className="card-body">
                                <h3 className="card-title">📧 Email Support</h3>
                                <p className="text-base-content/70 mb-4">
                                    Send us a detailed description of your issue for personalized help.
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-base-content/60 text-sm mb-4">
                                    <li>Response within 24 hours</li>
                                    <li>Include screenshots if helpful</li>
                                    <li>Mention your plan and account details</li>
                                </ul>
                                <div className="card-actions">
                                    <a href="mailto:support@helpninja.app" className="btn btn-primary">
                                        Email Support
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="card bg-base-100">
                            <div className="card-body">
                                <h3 className="card-title">💬 Live Chat</h3>
                                <p className="text-base-content/70 mb-4">
                                    Chat with our support team in real-time for immediate assistance.
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-base-content/60 text-sm mb-4">
                                    <li>Available business hours (9 AM - 6 PM EST)</li>
                                    <li>Instant responses</li>
                                    <li>Screen sharing available</li>
                                </ul>
                                <div className="card-actions">
                                    <button className="btn btn-outline">
                                        Start Chat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-4">Before Contacting Support</h3>
                    <div className="bg-base-100 p-4 rounded">
                        <p className="text-base-content/80 mb-3">
                            Please gather this information to help us resolve your issue faster:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                            <li>Your account email address and plan type</li>
                            <li>Description of the problem and when it started</li>
                            <li>Steps you&apos;ve already tried to resolve it</li>
                            <li>Screenshots or error messages (if applicable)</li>
                            <li>Browser type and version you&apos;re using</li>
                            <li>URL where the issue occurs</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* System Status */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">📊 System Status & Updates</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title">🟢 Service Status</h3>
                            <p className="text-base-content/70 mb-4">
                                Check if the issue is related to a service outage or maintenance.
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Chat API</span>
                                    <div className="badge badge-success">Operational</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Dashboard</span>
                                    <div className="badge badge-success">Operational</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Integrations</span>
                                    <div className="badge badge-success">Operational</div>
                                </div>
                            </div>
                            <div className="card-actions justify-end mt-4">
                                <a href="https://status.helpninja.app" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                    View Status Page →
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title">📢 Recent Updates</h3>
                            <p className="text-base-content/70 mb-4">
                                Stay informed about new features and improvements.
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Dashboard UI improvements</span>
                                    <span className="text-base-content/60">Dec 15</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>New Discord integration</span>
                                    <span className="text-base-content/60">Dec 10</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Enhanced analytics</span>
                                    <span className="text-base-content/60">Dec 5</span>
                                </div>
                            </div>
                            <div className="card-actions justify-end mt-4">
                                <a href="https://helpninja.app/changelog" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                    View Changelog →
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Prevention Tips */}
            <section>
                <h2 className="text-2xl font-bold text-base-content mb-4">🛡️ Prevention Tips</h2>

                <div className="bg-success/10 border border-success/20 rounded-lg p-6">
                    <h3 className="text-success font-semibold mb-4">Avoid Common Issues:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ul className="list-disc list-inside space-y-2 text-base-content/80">
                            <li>Test integrations regularly with sample messages</li>
                            <li>Monitor usage to avoid hitting plan limits</li>
                            <li>Keep your knowledge base content up-to-date</li>
                            <li>Review escalation rules periodically</li>
                            <li>Update payment methods before expiration</li>
                        </ul>
                        <ul className="list-disc list-inside space-y-2 text-base-content/80">
                            <li>Clear browser cache monthly</li>
                            <li>Use supported browsers and keep them updated</li>
                            <li>Subscribe to our status page for outage notifications</li>
                            <li>Document your configuration for team reference</li>
                            <li>Train team members on proper usage</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
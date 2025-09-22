import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Dashboard Guide - helpNINJA Help Center',
    description: 'Complete guide to using the helpNINJA dashboard for managing conversations, analytics, and settings.',
};

export default function DashboardGuidePage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-base-content mb-4">
                    Dashboard Guide
                </h1>
                <p className="text-xl text-base-content/70">
                    Master the helpNINJA dashboard to manage conversations, analyze performance, and optimize your AI assistant.
                </p>
            </div>

            {/* Overview */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Dashboard Overview</h2>
                <div className="bg-base-200 rounded-lg p-6 mb-6">
                    <p className="text-base-content/80 mb-4">
                        The helpNINJA dashboard is your control center for managing all aspects of your AI-powered customer support.
                        From here, you can monitor conversations, analyze performance, configure settings, and manage integrations.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-chart-line text-blue-500"></i></div>
                            <div className="font-semibold">Analytics</div>
                            <div className="text-sm text-base-content/60">Real-time insights</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-comments text-green-500"></i></div>
                            <div className="font-semibold">Conversations</div>
                            <div className="text-sm text-base-content/60">Manage chats</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-wrench text-orange-500"></i></div>
                            <div className="font-semibold">Configuration</div>
                            <div className="text-sm text-base-content/60">Customize everything</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-link text-purple-500"></i></div>
                            <div className="font-semibold">Integrations</div>
                            <div className="text-sm text-base-content/60">Connect tools</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Getting Started */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Getting Started</h2>

                <div className="steps steps-vertical lg:steps-horizontal mb-6">
                    <div className="step step-primary">Access Dashboard</div>
                    <div className="step">Explore Interface</div>
                    <div className="step">Configure Settings</div>
                    <div className="step">Monitor Performance</div>
                </div>

                <div className="space-y-4">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-shield-keyhole text-green-500 mr-2"></i>Accessing Your Dashboard</h3>
                            <p className="text-base-content/70 mb-4">
                                Sign in to your helpNINJA account and navigate to the dashboard to get started.
                            </p>
                            <div className="card-actions">
                                <Link href="/dashboard" className="btn btn-primary btn-sm">
                                    Go to Dashboard →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Sections */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Main Dashboard Sections</h2>

                {/* Analytics Section */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4"><i className="fa-duotone fa-solid fa-chart-line text-blue-500 mr-2"></i>Analytics & Performance</h3>
                    <div className="bg-base-200 rounded-lg p-6 mb-4">
                        <p className="text-base-content/80 mb-4">
                            Monitor your AI assistant&apos;s performance with real-time analytics and insights.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="stat bg-base-100 rounded-lg">
                                <div className="stat-title">Live Conversations</div>
                                <div className="stat-value text-primary">23</div>
                                <div className="stat-desc">Active right now</div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg">
                                <div className="stat-title">Response Time</div>
                                <div className="stat-value text-success">1.2s</div>
                                <div className="stat-desc">Average this week</div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg">
                                <div className="stat-title">AI Confidence</div>
                                <div className="stat-value text-info">91.3%</div>
                                <div className="stat-desc">This month</div>
                            </div>
                            <div className="stat bg-base-100 rounded-lg">
                                <div className="stat-title">Satisfaction</div>
                                <div className="stat-value text-warning">4.6/5</div>
                                <div className="stat-desc">Customer rating</div>
                            </div>
                        </div>

                        <h4 className="font-semibold mb-3">Key Metrics Include:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                            <li><strong>Message Volume:</strong> Total conversations and messages over time</li>
                            <li><strong>Response Times:</strong> How quickly your AI responds to queries</li>
                            <li><strong>Confidence Scores:</strong> AI confidence levels for generated responses</li>
                            <li><strong>Escalation Rates:</strong> Frequency of human handoffs</li>
                            <li><strong>Customer Satisfaction:</strong> User feedback and ratings</li>
                            <li><strong>Popular Topics:</strong> Most common customer questions</li>
                        </ul>
                    </div>
                </div>

                {/* Conversations Section */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4"><i className="fa-duotone fa-solid fa-comments text-green-500 mr-2"></i>Conversations Management</h3>
                    <div className="bg-base-200 rounded-lg p-6 mb-4">
                        <p className="text-base-content/80 mb-4">
                            View, manage, and respond to customer conversations in real-time.
                        </p>

                        <div className="mockup-browser bg-base-100 mb-6">
                            <div className="mockup-browser-toolbar">
                                <div className="input">helpninja.app/dashboard/conversations</div>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-base-200 rounded">
                                        <div className="flex items-center space-x-3">
                                            <div className="avatar placeholder">
                                                <div className="bg-primary text-primary-content rounded-full w-8">
                                                    <span className="text-xs">JD</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-semibold">John Doe</div>
                                                <div className="text-sm text-base-content/60">Billing question</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="badge badge-success">Active</div>
                                            <div className="text-sm text-base-content/60">2 min ago</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-base-200 rounded">
                                        <div className="flex items-center space-x-3">
                                            <div className="avatar placeholder">
                                                <div className="bg-secondary text-secondary-content rounded-full w-8">
                                                    <span className="text-xs">SM</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-semibold">Sarah Miller</div>
                                                <div className="text-sm text-base-content/60">Product inquiry</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="badge badge-warning">Escalated</div>
                                            <div className="text-sm text-base-content/60">15 min ago</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold mb-3">Conversation Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                            <li><strong>Real-time Updates:</strong> See new messages as they arrive</li>
                            <li><strong>Human Takeover:</strong> Step in to respond personally when needed</li>
                            <li><strong>Conversation History:</strong> View complete chat transcripts</li>
                            <li><strong>Customer Context:</strong> See user information and previous interactions</li>
                            <li><strong>Escalation Management:</strong> Handle escalated conversations efficiently</li>
                            <li><strong>Response Suggestions:</strong> AI-powered response recommendations</li>
                        </ul>
                    </div>
                </div>

                {/* Documents Section */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4"><i className="fa-duotone fa-solid fa-books text-purple-500 mr-2"></i>Knowledge Base Management</h3>
                    <div className="bg-base-200 rounded-lg p-6 mb-4">
                        <p className="text-base-content/80 mb-4">
                            Manage the content that powers your AI assistant&apos;s knowledge base.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="card bg-base-100">
                                <div className="card-body">
                                    <h4 className="card-title text-lg"><i className="fa-duotone fa-solid fa-file-text text-blue-500 mr-2"></i>Documents</h4>
                                    <p className="text-base-content/70">Upload and manage individual documents, PDFs, and text files.</p>
                                    <div className="card-actions justify-end">
                                        <div className="badge badge-outline">Auto-indexed</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card bg-base-100">
                                <div className="card-body">
                                    <h4 className="card-title text-lg"><i className="fa-duotone fa-solid fa-globe text-green-500 mr-2"></i>Website Crawling</h4>
                                    <p className="text-base-content/70">Automatically index content from your website or documentation.</p>
                                    <div className="card-actions justify-end">
                                        <div className="badge badge-outline">Real-time sync</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold mb-3">Content Management Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                            <li><strong>Document Upload:</strong> Support for PDFs, text files, and more</li>
                            <li><strong>Website Crawling:</strong> Automatic content ingestion from URLs</li>
                            <li><strong>Content Preview:</strong> See how documents are processed and chunked</li>
                            <li><strong>Search Testing:</strong> Test how well your content matches queries</li>
                            <li><strong>Indexing Status:</strong> Monitor processing and embedding status</li>
                            <li><strong>Content Analytics:</strong> See which content gets referenced most</li>
                        </ul>
                    </div>
                </div>

                {/* Widget Configuration */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4"><i className="fa-duotone fa-solid fa-wrench text-orange-500 mr-2"></i>Widget Configuration</h3>
                    <div className="bg-base-200 rounded-lg p-6 mb-4">
                        <p className="text-base-content/80 mb-4">
                            Customize your chat widget&apos;s appearance, behavior, and content with real-time preview.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="card bg-base-100">
                                <div className="card-body text-center">
                                    <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-palette text-purple-500"></i></div>
                                    <h4 className="font-semibold">Appearance</h4>
                                    <p className="text-sm text-base-content/60">Colors, themes, positioning</p>
                                </div>
                            </div>
                            <div className="card bg-base-100">
                                <div className="card-body text-center">
                                    <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-gear text-blue-500"></i></div>
                                    <h4 className="font-semibold">Behavior</h4>
                                    <p className="text-sm text-base-content/60">Auto-open, animations</p>
                                </div>
                            </div>
                            <div className="card bg-base-100">
                                <div className="card-body text-center">
                                    <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-comments text-green-500"></i></div>
                                    <h4 className="font-semibold">Content</h4>
                                    <p className="text-sm text-base-content/60">Messages, AI personality</p>
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold mb-3">Configuration Options:</h4>
                        <ul className="list-disc list-inside space-y-1 text-base-content/70">
                            <li><strong>Visual Customization:</strong> Colors, themes, fonts, and positioning</li>
                            <li><strong>Behavioral Settings:</strong> Auto-open timing, animation preferences</li>
                            <li><strong>Content Personalization:</strong> Welcome messages, AI name, voice style</li>
                            <li><strong>Real-time Preview:</strong> See changes instantly as you make them</li>
                            <li><strong>Installation Code:</strong> Copy-paste widget code for your website</li>
                            <li><strong>Multi-site Support:</strong> Different configurations for different domains</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Team Management */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-users text-blue-500 mr-2"></i>Team Management</h2>

                <div className="bg-base-200 rounded-lg p-6 mb-6">
                    <p className="text-base-content/80 mb-4">
                        Collaborate with your team by inviting members and managing roles and permissions.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h4 className="font-semibold mb-3">Team Roles</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-base-100 rounded">
                                    <span className="font-medium">Owner</span>
                                    <div className="badge badge-primary">Full Access</div>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-base-100 rounded">
                                    <span className="font-medium">Admin</span>
                                    <div className="badge badge-secondary">Almost Everything</div>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-base-100 rounded">
                                    <span className="font-medium">Support</span>
                                    <div className="badge badge-accent">Conversations Only</div>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-base-100 rounded">
                                    <span className="font-medium">Viewer</span>
                                    <div className="badge badge-ghost">Read Only</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3">Invitation Process</h4>
                            <ol className="list-decimal list-inside space-y-2 text-base-content/70">
                                <li>Send email invitation with role assignment</li>
                                <li>New member receives secure invitation link</li>
                                <li>They create account and join your organization</li>
                                <li>Access level automatically applied based on role</li>
                            </ol>
                        </div>
                    </div>

                    <div className="alert alert-info">
                        <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>Team member limits depend on your subscription plan. Upgrade for larger teams.</span>
                    </div>
                </div>
            </section>

            {/* Settings */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-gear text-blue-500 mr-2"></i>Account Settings</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-shield-keyhole text-green-500 mr-2"></i>Security Settings</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>Change password and email</li>
                                <li>Two-factor authentication</li>
                                <li>API key management</li>
                                <li>Session management</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-credit-card text-blue-500 mr-2"></i>Billing & Subscription</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>View current plan and usage</li>
                                <li>Upgrade or downgrade plans</li>
                                <li>Billing history and invoices</li>
                                <li>Payment method management</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-bell text-yellow-500 mr-2"></i>Notification Preferences</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>Email notification settings</li>
                                <li>Escalation alerts</li>
                                <li>Performance reports</li>
                                <li>System updates</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-globe text-green-500 mr-2"></i>Site Management</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>Add multiple domains</li>
                                <li>Domain verification</li>
                                <li>Site-specific configurations</li>
                                <li>SSL certificate management</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tips and Best Practices */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-lightbulb text-yellow-500 mr-2"></i>Tips & Best Practices</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-success/10 border border-success/20">
                        <div className="card-body">
                            <h3 className="card-title text-success"><i className="fa-duotone fa-solid fa-check text-green-500 mr-2"></i>Do&apos;s</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/80">
                                <li>Regularly update your knowledge base</li>
                                <li>Monitor conversation quality daily</li>
                                <li>Set up escalation rules early</li>
                                <li>Test widget changes before deploying</li>
                                <li>Review analytics weekly for insights</li>
                                <li>Train team members on the interface</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-error/10 border border-error/20">
                        <div className="card-body">
                            <h3 className="card-title text-error"><i className="fa-duotone fa-solid fa-xmark text-red-500 mr-2"></i>Don&apos;ts</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/80">
                                <li>Don&apos;t ignore low confidence warnings</li>
                                <li>Don&apos;t forget to test escalation flows</li>
                                <li>Don&apos;t leave outdated content in knowledge base</li>
                                <li>Don&apos;t skip regular performance reviews</li>
                                <li>Don&apos;t make major changes without backup</li>
                                <li>Don&apos;t ignore customer feedback</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">⌨️ Keyboard Shortcuts</h2>

                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-4">Speed up your workflow with these keyboard shortcuts:</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">Navigation</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Dashboard</span>
                                    <kbd className="kbd kbd-sm">Alt + D</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Conversations</span>
                                    <kbd className="kbd kbd-sm">Alt + C</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Analytics</span>
                                    <kbd className="kbd kbd-sm">Alt + A</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Settings</span>
                                    <kbd className="kbd kbd-sm">Alt + S</kbd>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-3">Actions</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Search</span>
                                    <kbd className="kbd kbd-sm">Ctrl + K</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>New Document</span>
                                    <kbd className="kbd kbd-sm">Ctrl + N</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Refresh</span>
                                    <kbd className="kbd kbd-sm">F5</kbd>
                                </div>
                                <div className="flex justify-between">
                                    <span>Help</span>
                                    <kbd className="kbd kbd-sm">?</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Next Steps */}
            <section>
                <h2 className="text-2xl font-bold text-base-content mb-4">Next Steps</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/docs/integrations" className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-link text-purple-500 mr-2"></i>Set Up Integrations</h3>
                            <p className="text-base-content/70">
                                Connect Slack, email, and other tools to create a seamless escalation workflow.
                            </p>
                        </div>
                    </Link>

                    <Link href="/docs/billing" className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-credit-card text-blue-500 mr-2"></i>Manage Your Plan</h3>
                            <p className="text-base-content/70">
                                Learn about subscription features, usage limits, and how to optimize your plan.
                            </p>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}
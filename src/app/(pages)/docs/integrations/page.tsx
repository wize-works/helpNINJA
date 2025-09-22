import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Integrations Guide - helpNINJA Help Center',
    description: 'Complete guide to setting up and managing helpNINJA integrations with Slack, email, Teams, Discord, and more.',
};

export default function IntegrationsPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-base-content mb-4">
                    Integrations Guide
                </h1>
                <p className="text-xl text-base-content/70">
                    Connect helpNINJA with your favorite tools for seamless customer support workflow and escalations.
                </p>
            </div>

            {/* Overview */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Available Integrations</h2>
                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-4">
                        helpNINJA integrates with popular communication platforms to streamline your support workflow.
                        Set up escalations to notify your team when customers need human assistance or when the AI
                        confidence is below your threshold.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="text-center">
                            <div className="text-3xl mb-2"><i className="fa-duotone fa-solid fa-comments text-blue-500"></i></div>
                            <div className="font-semibold">Slack</div>
                            <div className="text-sm text-base-content/60">Team chat</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2"><i className="fa-duotone fa-solid fa-envelope text-green-500"></i></div>
                            <div className="font-semibold">Email</div>
                            <div className="text-sm text-base-content/60">Direct alerts</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2"><i className="fa-duotone fa-solid fa-users text-purple-500"></i></div>
                            <div className="font-semibold">Teams</div>
                            <div className="text-sm text-base-content/60">Microsoft</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2"><i className="fa-duotone fa-solid fa-gamepad text-indigo-500"></i></div>
                            <div className="font-semibold">Discord</div>
                            <div className="text-sm text-base-content/60">Gaming communities</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Benefits */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Integration Benefits</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-bolt text-yellow-500 mr-2"></i>Real-time Notifications</h3>
                            <p className="text-base-content/70">
                                Get instant alerts when customers need human assistance, ensuring quick response times.
                            </p>
                        </div>
                    </div>
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-palette text-purple-500 mr-2"></i>Customizable Workflows</h3>
                            <p className="text-base-content/70">
                                Configure triggers, channels, and message formats to match your team&apos;s workflow.
                            </p>
                        </div>
                    </div>
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-mobile text-blue-500 mr-2"></i>Mobile Ready</h3>
                            <p className="text-base-content/70">
                                Receive notifications on all your devices, ensuring you never miss important escalations.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Escalation Triggers */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Escalation Triggers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h4 className="card-title text-lg"><i className="fa-duotone fa-solid fa-robot text-blue-500 mr-2"></i>Automatic Triggers</h4>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li><strong>Low Confidence:</strong> AI response confidence below 55%</li>
                                <li><strong>Keyword Detection:</strong> Customer uses phrases like &quot;speak to human&quot;</li>
                                <li><strong>Restricted Content:</strong> Questions outside knowledge base scope</li>
                                <li><strong>Error Conditions:</strong> Technical issues with AI processing</li>
                            </ul>
                        </div>
                    </div>
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h4 className="card-title text-lg"><i className="fa-duotone fa-solid fa-user text-green-500 mr-2"></i>Manual Triggers</h4>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li><strong>User Request:</strong> Customer explicitly asks for human help</li>
                                <li><strong>Agent Escalation:</strong> Team member manually escalates conversation</li>
                                <li><strong>VIP Routing:</strong> High-priority customers get immediate attention</li>
                                <li><strong>Business Hours:</strong> After-hours conversations route to on-call</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Slack Integration */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-comments text-blue-500 mr-2"></i>Slack Integration</h2>

                <div className="bg-base-200 rounded-lg p-6 mb-6">
                    <p className="text-base-content/80 mb-6">
                        The most popular integration for team-based support. Get rich notifications with conversation context
                        and respond directly from Slack.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">Setup Steps:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-base-content/70">
                                <li>Go to Dashboard → Integrations</li>
                                <li>Click &quot;Add Slack Integration&quot;</li>
                                <li>Authorize helpNINJA in your Slack workspace</li>
                                <li>Select target channel for notifications</li>
                                <li>Configure escalation rules and triggers</li>
                                <li>Test the integration with a sample message</li>
                            </ol>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Features:</h4>
                            <ul className="list-disc list-inside space-y-2 text-base-content/70">
                                <li>Rich message formatting with customer context</li>
                                <li>Thread replies for organized conversations</li>
                                <li>Direct links to dashboard conversations</li>
                                <li>Custom channel routing based on topic</li>
                                <li>@mention specific team members</li>
                                <li>Escalation status tracking</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="alert alert-info">
                    <i className="fa-duotone fa-solid fa-lightbulb text-yellow-500"></i>
                    <div>
                        <h4 className="font-bold">Pro Tip</h4>
                        <p>Create separate channels for different escalation types (urgent, billing, technical) to better organize your team&apos;s workflow.</p>
                    </div>
                </div>
            </section>

            {/* Email Integration */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-envelope text-green-500 mr-2"></i>Email Integration</h2>

                <div className="bg-base-200 rounded-lg p-6 mb-6">
                    <p className="text-base-content/80 mb-6">
                        Perfect for teams that prefer email notifications or need to integrate with existing ticketing systems.
                        Supports multiple recipients and custom email templates.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-3">Configuration:</h4>
                            <ul className="list-disc list-inside space-y-2 text-base-content/70">
                                <li>Add multiple recipient emails</li>
                                <li>Customize email subject templates</li>
                                <li>Include conversation transcripts</li>
                                <li>Set priority levels for urgent escalations</li>
                                <li>Configure retry policies for failed sends</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Email Content:</h4>
                            <ul className="list-disc list-inside space-y-2 text-base-content/70">
                                <li>Customer information and contact details</li>
                                <li>Complete conversation history</li>
                                <li>AI confidence score and reasoning</li>
                                <li>Direct dashboard link for quick access</li>
                                <li>Suggested response templates</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Teams Integration */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-users text-purple-500 mr-2"></i>Microsoft Teams Integration</h2>

                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-4">
                        Seamlessly integrate with Microsoft Teams for organizations using the Microsoft 365 ecosystem.
                        Get adaptive cards with rich formatting and interactive elements.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <i className="fa-duotone fa-solid fa-id-card text-blue-500 text-2xl mb-2"></i>
                            <h4 className="font-semibold">Adaptive Cards</h4>
                            <p className="text-sm text-base-content/60">Rich, interactive notifications</p>
                        </div>
                        <div className="text-center">
                            <i className="fa-duotone fa-solid fa-users-gear text-green-500 text-2xl mb-2"></i>
                            <h4 className="font-semibold">Team Channels</h4>
                            <p className="text-sm text-base-content/60">Route to specific Teams channels</p>
                        </div>
                        <div className="text-center">
                            <i className="fa-duotone fa-solid fa-link text-purple-500 text-2xl mb-2"></i>
                            <h4 className="font-semibold">Deep Links</h4>
                            <p className="text-sm text-base-content/60">Quick access to conversations</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Advanced Configuration */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-gear text-orange-500 mr-2"></i>Advanced Configuration</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h4 className="card-title"><i className="fa-duotone fa-solid fa-list text-blue-500 mr-2"></i>Escalation Rules</h4>
                            <p className="text-base-content/70 mb-4">
                                Create sophisticated rules to route escalations based on content, time, customer priority, and more.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                <li>Keyword-based routing</li>
                                <li>Customer tier prioritization</li>
                                <li>Time-based escalation paths</li>
                                <li>Department-specific channels</li>
                                <li>Fallback notification chains</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h4 className="card-title"><i className="fa-duotone fa-solid fa-bullseye text-green-500 mr-2"></i>Smart Targeting</h4>
                            <p className="text-base-content/70 mb-4">
                                Automatically route escalations to the right team members based on expertise and availability.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                <li>Round-robin assignment</li>
                                <li>Skill-based routing</li>
                                <li>Workload balancing</li>
                                <li>Timezone-aware escalations</li>
                                <li>On-call schedule integration</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testing & Monitoring */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-flask text-cyan-500 mr-2"></i>Testing & Monitoring</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-vial text-purple-500 mr-2"></i>Testing Integrations</h3>
                            <p className="text-base-content/70 mb-4">
                                Verify your integrations work correctly before going live with comprehensive testing tools.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                <li>Send test escalation messages</li>
                                <li>Verify notification delivery</li>
                                <li>Test different trigger conditions</li>
                                <li>Validate message formatting</li>
                                <li>Check link functionality</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-chart-line text-blue-500 mr-2"></i>Monitoring & Analytics</h3>
                            <p className="text-base-content/70 mb-4">
                                Track integration performance and escalation patterns to optimize your support workflow.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                <li>Delivery success rates</li>
                                <li>Response time analytics</li>
                                <li>Escalation volume trends</li>
                                <li>Channel performance metrics</li>
                                <li>Team workload distribution</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Troubleshooting */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-wrench text-orange-500 mr-2"></i>Troubleshooting</h2>

                <div className="space-y-6">
                    <div className="collapse collapse-arrow bg-base-100">
                        <input type="radio" name="troubleshooting-accordion" />
                        <div className="collapse-title text-xl font-medium">
                            <i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>
                            Integration Not Receiving Messages
                        </div>
                        <div className="collapse-content">
                            <div className="space-y-3">
                                <p className="text-base-content/70">If your integration isn&apos;t receiving escalation messages:</p>
                                <ul className="list-disc list-inside space-y-1 text-base-content/70 pl-4">
                                    <li>Check integration status in Dashboard → Integrations</li>
                                    <li>Verify webhook URLs are accessible from the internet</li>
                                    <li>Confirm escalation triggers are properly configured</li>
                                    <li>Test with manual escalation to isolate the issue</li>
                                    <li>Check integration logs for error messages</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-100">
                        <input type="radio" name="troubleshooting-accordion" />
                        <div className="collapse-title text-xl font-medium">
                            <i className="fa-duotone fa-solid fa-clock text-red-500 mr-2"></i>
                            Message Delivery Delays
                        </div>
                        <div className="collapse-content">
                            <div className="space-y-3">
                                <p className="text-base-content/70">If messages are arriving with delays:</p>
                                <ul className="list-disc list-inside space-y-1 text-base-content/70 pl-4">
                                    <li>Check third-party service status (Slack, Teams, etc.)</li>
                                    <li>Review retry policies and queue status</li>
                                    <li>Monitor integration health metrics</li>
                                    <li>Consider adjusting escalation thresholds</li>
                                    <li>Contact support for platform-specific issues</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-100">
                        <input type="radio" name="troubleshooting-accordion" />
                        <div className="collapse-title text-xl font-medium">
                            <i className="fa-duotone fa-solid fa-ban text-red-500 mr-2"></i>
                            Permission and Authentication Issues
                        </div>
                        <div className="collapse-content">
                            <div className="space-y-3">
                                <p className="text-base-content/70">For permission-related problems:</p>
                                <ul className="list-disc list-inside space-y-1 text-base-content/70 pl-4">
                                    <li>Re-authorize the integration in your platform</li>
                                    <li>Check required scopes and permissions</li>
                                    <li>Verify bot/app installation in target channels</li>
                                    <li>Review organization security policies</li>
                                    <li>Contact your IT admin for enterprise restrictions</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 card bg-base-100">
                    <div className="card-body">
                        <h3 className="card-title"><i className="fa-duotone fa-solid fa-life-ring text-blue-500 mr-2"></i>Need More Help?</h3>
                        <p className="text-base-content/70 mb-4">
                            If you&apos;re still experiencing issues with your integrations, our support team is here to help.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <a href="mailto:support@helpninja.app" className="btn btn-primary btn-sm">
                                <i className="fa-duotone fa-solid fa-envelope mr-2"></i>
                                Email Support
                            </a>
                            <Link href="/docs/troubleshooting" className="btn btn-outline btn-sm">
                                <i className="fa-duotone fa-solid fa-book mr-2"></i>
                                Troubleshooting Guide
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
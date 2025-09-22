import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Billing & Plans - helpNINJA Help Center',
    description: 'Complete guide to helpNINJA subscription plans, billing, usage limits, and account management.',
};

export default function BillingPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-base-content mb-4">
                    Billing & Plans Guide
                </h1>
                <p className="text-xl text-base-content/70">
                    Everything you need to know about helpNINJA subscription plans, billing, usage limits, and managing your account.
                </p>
            </div>

            {/* Overview */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Subscription Overview</h2>
                <div className="bg-base-200 rounded-lg p-6">
                    <p className="text-base-content/80 mb-4">
                        helpNINJA offers flexible subscription plans designed to grow with your business. All plans include
                        core AI-powered chat functionality, with higher tiers providing increased message limits, advanced
                        features, and priority support.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-rocket text-blue-500"></i></div>
                            <div className="font-semibold">Starter</div>
                            <div className="text-sm text-base-content/60">Perfect for trying out</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-briefcase text-green-500"></i></div>
                            <div className="font-semibold">Professional</div>
                            <div className="text-sm text-base-content/60">For growing businesses</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-building text-purple-500"></i></div>
                            <div className="font-semibold">Agency</div>
                            <div className="text-sm text-base-content/60">For agencies & enterprises</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl mb-2"><i className="fa-duotone fa-solid fa-bolt text-yellow-500"></i></div>
                            <div className="font-semibold">Enterprise</div>
                            <div className="text-sm text-base-content/60">Custom solutions</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Plan Comparison */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Plan Comparison</h2>

                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th className="text-center">Starter</th>
                                <th className="text-center">Professional</th>
                                <th className="text-center">Agency</th>
                                <th className="text-center">Enterprise</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="font-semibold">Monthly Messages</td>
                                <td className="text-center">1,000</td>
                                <td className="text-center">10,000</td>
                                <td className="text-center">100,000</td>
                                <td className="text-center">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">Team Members</td>
                                <td className="text-center">2</td>
                                <td className="text-center">10</td>
                                <td className="text-center">50</td>
                                <td className="text-center">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">Websites</td>
                                <td className="text-center">1</td>
                                <td className="text-center">5</td>
                                <td className="text-center">25</td>
                                <td className="text-center">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">Knowledge Base Storage</td>
                                <td className="text-center">100 MB</td>
                                <td className="text-center">1 GB</td>
                                <td className="text-center">10 GB</td>
                                <td className="text-center">Unlimited</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">Integrations</td>
                                <td className="text-center">Basic</td>
                                <td className="text-center">All Available</td>
                                <td className="text-center">All + Custom</td>
                                <td className="text-center">All + Custom + API</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">Analytics</td>
                                <td className="text-center">Basic</td>
                                <td className="text-center">Advanced</td>
                                <td className="text-center">Advanced + Export</td>
                                <td className="text-center">Custom Dashboards</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">Support</td>
                                <td className="text-center">Email</td>
                                <td className="text-center">Email + Chat</td>
                                <td className="text-center">Priority Support</td>
                                <td className="text-center">Dedicated Success Manager</td>
                            </tr>
                            <tr>
                                <td className="font-semibold">SLA</td>
                                <td className="text-center">None</td>
                                <td className="text-center">99.5%</td>
                                <td className="text-center">99.9%</td>
                                <td className="text-center">99.99%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="alert alert-info mt-6">
                    <svg className="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>All plans include core AI chat functionality, widget customization, conversation management, and basic escalation features.</span>
                </div>
            </section>

            {/* Understanding Usage */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Understanding Usage & Limits</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-chart-line text-blue-500 mr-2"></i> What Counts as a Message?</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li><strong>Customer messages:</strong> Each user question/input</li>
                                <li><strong>AI responses:</strong> Each AI-generated reply</li>
                                <li><strong>Escalated conversations:</strong> Messages in escalated chats</li>
                                <li><strong>API calls:</strong> Programmatic message submissions</li>
                            </ul>
                            <div className="alert alert-info mt-4">
                                <span className="text-sm">System messages, error responses, and widget configuration changes do not count toward your limit.</span>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-chart-line text-green-500 mr-2"></i>Monitoring Your Usage</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li><strong>Dashboard overview:</strong> Real-time usage display</li>
                                <li><strong>Usage alerts:</strong> Notifications at 80% and 100%</li>
                                <li><strong>Historical data:</strong> Monthly usage trends</li>
                                <li><strong>Projection tools:</strong> Estimate end-of-month usage</li>
                            </ul>
                            <div className="stat bg-base-100 rounded-lg mt-4">
                                <div className="stat-title">Current Usage</div>
                                <div className="stat-value text-primary">2,847</div>
                                <div className="stat-desc">of 10,000 messages (28.5%)</div>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-semibold mb-4">Usage Reset & Billing Cycles</h3>
                <div className="bg-base-200 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2"><i className="fa-duotone fa-solid fa-calendar text-blue-500 mr-2"></i> Monthly Reset</h4>
                            <p className="text-base-content/70 text-sm">
                                Message limits reset on your billing date each month. Unused messages do not roll over.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2"><i className="fa-duotone fa-solid fa-sync text-blue-500 mr-2"></i>Upgrade Timing</h4>
                            <p className="text-base-content/70 text-sm">
                                Plan upgrades take effect immediately with prorated billing. New limits apply right away.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2"><i className="fa-duotone fa-solid fa-triangle-exclamation text-yellow-500 mr-2"></i>Overage Handling</h4>
                            <p className="text-base-content/70 text-sm">
                                If you exceed limits, service continues but overage charges may apply. Consider upgrading.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Billing Management */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">Billing Management</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-credit-card text-blue-500 mr-2"></i>Payment Methods</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>Credit and debit cards (Visa, Mastercard, Amex)</li>
                                <li>PayPal for international customers</li>
                                <li>Bank transfers for Enterprise accounts</li>
                                <li>Automatic payment processing via Stripe</li>
                                <li>Secure PCI-compliant payment handling</li>
                            </ul>
                            <div className="card-actions justify-end mt-4">
                                <Link href="/dashboard/billing" className="btn btn-primary btn-sm">
                                    Manage Payment Methods →
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-clipboard text-orange-500 mr-2"></i> Billing Features</h3>
                            <ul className="list-disc list-inside space-y-1 text-base-content/70">
                                <li>Automatic monthly billing</li>
                                <li>Detailed usage breakdowns</li>
                                <li>Invoice history and downloads</li>
                                <li>Tax calculations and receipts</li>
                                <li>Billing alerts and notifications</li>
                            </ul>
                            <div className="card-actions justify-end mt-4">
                                <Link href="/dashboard/billing/history" className="btn btn-outline btn-sm">
                                    View Billing History →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-semibold mb-4">Managing Your Subscription</h3>

                <div className="steps steps-vertical lg:steps-horizontal mb-6">
                    <div className="step step-primary">Access Billing</div>
                    <div className="step">Review Current Plan</div>
                    <div className="step">Make Changes</div>
                    <div className="step">Confirm Updates</div>
                </div>

                <div className="space-y-4">
                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h4 className="card-title">Upgrading Your Plan</h4>
                            <ol className="list-decimal list-inside space-y-2 text-base-content/80">
                                <li>Navigate to <strong>Dashboard → Billing & Plans</strong></li>
                                <li>Click <strong>&quot;Upgrade Plan&quot;</strong> or <strong>&quot;Change Plan&quot;</strong></li>
                                <li>Review plan options and select your desired tier</li>
                                <li>Confirm billing changes and prorated amounts</li>
                                <li>Update payment method if needed</li>
                                <li>Complete the upgrade process</li>
                            </ol>
                            <div className="alert alert-success mt-4">
                                <span>Upgrades take effect immediately, and you&apos;ll only pay the prorated difference for the current billing period.</span>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-100">
                        <div className="card-body">
                            <h4 className="card-title">Downgrading Your Plan</h4>
                            <ol className="list-decimal list-inside space-y-2 text-base-content/80">
                                <li>Consider your current usage and future needs</li>
                                <li>Review what features you&apos;ll lose with the downgrade</li>
                                <li>Navigate to billing settings in your dashboard</li>
                                <li>Select a lower-tier plan</li>
                                <li>Confirm the change will take effect at your next billing cycle</li>
                                <li>Receive confirmation of the scheduled downgrade</li>
                            </ol>
                            <div className="alert alert-warning mt-4">
                                <span>Downgrades typically take effect at the end of your current billing period to avoid service disruption.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Enterprise Features */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-building text-purple-500"></i> Enterprise Features</h2>

                <div className="bg-base-200 rounded-lg p-6 mb-6">
                    <p className="text-base-content/80 mb-6">
                        Enterprise plans offer advanced features, custom integrations, and dedicated support for large organizations.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="card bg-base-100">
                            <div className="card-body">
                                <h4 className="card-title text-lg"><i className="fa-duotone fa-solid fa-shield-check text-green-500 mr-2"></i>Advanced Security</h4>
                                <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                    <li>Single Sign-On (SSO) integration</li>
                                    <li>Custom data retention policies</li>
                                    <li>SOC 2 Type II compliance</li>
                                    <li>Dedicated infrastructure</li>
                                    <li>Advanced audit logging</li>
                                </ul>
                            </div>
                        </div>

                        <div className="card bg-base-100">
                            <div className="card-body">
                                <h4 className="card-title text-lg"><i className="fa-duotone fa-solid fa-wrench text-orange-500 mr-2"></i> Custom Development</h4>
                                <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                    <li>Custom integration development</li>
                                    <li>API access and webhooks</li>
                                    <li>White-label solutions</li>
                                    <li>Custom AI model training</li>
                                    <li>Dedicated development resources</li>
                                </ul>
                            </div>
                        </div>

                        <div className="card bg-base-100">
                            <div className="card-body">
                                <h4 className="card-title text-lg">👨‍<i className="fa-duotone fa-solid fa-briefcase text-green-500"></i> Dedicated Support</h4>
                                <ul className="list-disc list-inside space-y-1 text-base-content/70 text-sm">
                                    <li>Dedicated customer success manager</li>
                                    <li>Priority technical support</li>
                                    <li>Regular strategy reviews</li>
                                    <li>Custom training and onboarding</li>
                                    <li>24/7 emergency support</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-xl font-semibold mb-4">Interested in Enterprise?</h3>
                    <p className="text-base-content/70 mb-6">
                        Contact our sales team to discuss custom pricing and features tailored to your organization&apos;s needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="mailto:sales@helpninja.app" className="btn btn-primary">
                            <i className="fa-duotone fa-solid fa-envelope text-blue-500 mr-2"></i> Contact Sales
                        </a>
                        <a href="https://calendly.com/helpninja/enterprise-demo" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                            <i className="fa-duotone fa-solid fa-calendar text-blue-500 mr-2"></i> Schedule Demo
                        </a>
                    </div>
                </div>
            </section>

            {/* Billing FAQ */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4">❓ Billing FAQ</h2>

                <div className="space-y-4">
                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Can I change my plan at any time?
                        </div>
                        <div className="collapse-content">
                            <p className="text-base-content/80">
                                Yes! You can upgrade your plan immediately with prorated billing. Downgrades typically take effect
                                at the end of your current billing cycle to ensure uninterrupted service.
                            </p>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            What happens if I exceed my message limit?
                        </div>
                        <div className="collapse-content">
                            <p className="text-base-content/80 mb-3">
                                Your service will continue to work, but you may incur overage charges. We recommend upgrading
                                to a higher plan if you consistently exceed limits.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/60">
                                <li>Overage rates: $0.05 per additional message</li>
                                <li>You&apos;ll receive warnings at 80% and 100% usage</li>
                                <li>Overages appear on your next monthly invoice</li>
                            </ul>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Is there a free trial available?
                        </div>
                        <div className="collapse-content">
                            <p className="text-base-content/80">
                                Yes! All new accounts include a 14-day free trial with full access to Professional plan features.
                                No credit card required to start your trial.
                            </p>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Can I cancel my subscription?
                        </div>
                        <div className="collapse-content">
                            <p className="text-base-content/80 mb-3">
                                Yes, you can cancel your subscription at any time. Your service will continue until the end
                                of your current billing period.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/60">
                                <li>No cancellation fees or penalties</li>
                                <li>Export your data before cancellation</li>
                                <li>Reactivate anytime with the same account</li>
                                <li>Conversation history preserved for 90 days</li>
                            </ul>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Do you offer annual billing discounts?
                        </div>
                        <div className="collapse-content">
                            <p className="text-base-content/80">
                                Yes! Annual billing offers a 20% discount compared to monthly billing. You can switch to
                                annual billing in your dashboard billing settings.
                            </p>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            What payment methods do you accept?
                        </div>
                        <div className="collapse-content">
                            <ul className="list-disc list-inside space-y-1 text-base-content/80">
                                <li>All major credit cards (Visa, Mastercard, American Express, Discover)</li>
                                <li>PayPal for international customers</li>
                                <li>Bank transfers for Enterprise accounts</li>
                                <li>All payments processed securely through Stripe</li>
                            </ul>
                        </div>
                    </div>

                    <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" />
                        <div className="collapse-title font-medium">
                            Can I get a refund?
                        </div>
                        <div className="collapse-content">
                            <p className="text-base-content/80">
                                We offer a 30-day money-back guarantee for new customers. For existing customers,
                                refunds are considered on a case-by-case basis. Contact our support team to discuss your situation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Account Management */}
            <section className="mb-12">
                <h2 className="text-2xl font-bold text-base-content mb-4"><i className="fa-duotone fa-solid fa-gear text-gray-500 mr-2"></i> Account Management</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-chart-line text-blue-500 mr-2"></i> Usage Analytics</h3>
                            <p className="text-base-content/70 mb-4">
                                Track your usage patterns and optimize your plan selection with detailed analytics.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/60 text-sm">
                                <li>Daily and monthly usage trends</li>
                                <li>Peak usage time analysis</li>
                                <li>Feature utilization reports</li>
                                <li>Cost optimization recommendations</li>
                            </ul>
                            <div className="card-actions justify-end mt-4">
                                <Link href="/dashboard/analytics" className="btn btn-primary btn-sm">
                                    View Analytics →
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-bell text-yellow-500 mr-2"></i>Billing Alerts</h3>
                            <p className="text-base-content/70 mb-4">
                                Stay informed about your usage and billing with customizable notifications.
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-base-content/60 text-sm">
                                <li>Usage threshold warnings</li>
                                <li>Billing reminder notifications</li>
                                <li>Payment failure alerts</li>
                                <li>Plan recommendation notifications</li>
                            </ul>
                            <div className="card-actions justify-end mt-4">
                                <Link href="/dashboard/settings/notifications" className="btn btn-outline btn-sm">
                                    Configure Alerts →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Next Steps */}
            <section>
                <h2 className="text-2xl font-bold text-base-content mb-4">Next Steps</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/docs/troubleshooting" className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-wrench text-orange-500 mr-2"></i> Troubleshooting Guide</h3>
                            <p className="text-base-content/70">
                                Find solutions to common issues and learn how to optimize your helpNINJA setup.
                            </p>
                        </div>
                    </Link>

                    <Link href="/dashboard/billing" className="card bg-base-200 hover:bg-base-300 transition-colors">
                        <div className="card-body">
                            <h3 className="card-title"><i className="fa-duotone fa-solid fa-credit-card text-blue-500 mr-2"></i>Manage Your Account</h3>
                            <p className="text-base-content/70">
                                Access your billing dashboard to view usage, update plans, and manage payment methods.
                            </p>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}
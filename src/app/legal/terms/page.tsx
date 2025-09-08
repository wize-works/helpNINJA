import Link from 'next/link';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';

export default function TermsOfServicePage() {
    return (
        <AnimatedPage>
            <div className="min-h-screen bg-base-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="mb-8">
                                <Link href="/" className="btn btn-ghost btn-sm">
                                    <i className="fa-solid fa-arrow-left mr-2" />
                                    Back to Home
                                </Link>
                            </div>
                        </StaggerChild>

                        <StaggerChild>
                            <div className="prose prose-lg max-w-none">
                                <h1>Terms of Service</h1>
                                <p className="text-base-content/60">Last updated: {new Date().toLocaleDateString()}</p>

                                <h2>Agreement to Terms</h2>
                                <p>
                                    By accessing and using helpNINJA (&quot;Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                                </p>

                                <h2>Description of Service</h2>
                                <p>
                                    helpNINJA is an AI-powered customer support platform that provides automated chat responses and escalation capabilities for websites and applications. Our service includes:
                                </p>
                                <ul>
                                    <li>AI-powered chat widgets for customer support</li>
                                    <li>Knowledge base ingestion and search</li>
                                    <li>Automated escalation to human support</li>
                                    <li>Analytics and reporting tools</li>
                                    <li>Integration capabilities with third-party services</li>
                                </ul>

                                <h2>User Accounts</h2>
                                <p>
                                    To access certain features of the Service, you must register for an account. You agree to:
                                </p>
                                <ul>
                                    <li>Provide accurate, current, and complete information</li>
                                    <li>Maintain the security of your password and account</li>
                                    <li>Accept responsibility for all activities under your account</li>
                                    <li>Notify us immediately of any unauthorized use</li>
                                </ul>

                                <h2>Acceptable Use</h2>
                                <p>You agree not to use the Service to:</p>
                                <ul>
                                    <li>Violate any laws or regulations</li>
                                    <li>Infringe on intellectual property rights</li>
                                    <li>Transmit harmful, offensive, or inappropriate content</li>
                                    <li>Interfere with or disrupt the Service</li>
                                    <li>Attempt to gain unauthorized access to our systems</li>
                                    <li>Use the Service for competitive analysis or benchmarking</li>
                                </ul>

                                <h2>Subscription and Payment</h2>
                                <p>
                                    helpNINJA offers both free and paid subscription plans. For paid plans:
                                </p>
                                <ul>
                                    <li>Subscription fees are billed in advance on a recurring basis</li>
                                    <li>You can cancel your subscription at any time</li>
                                    <li>Refunds are provided according to our refund policy</li>
                                    <li>We may change pricing with 30 days notice</li>
                                </ul>

                                <h2>Data and Privacy</h2>
                                <p>
                                    Your use of the Service is also governed by our Privacy Policy. We collect and process data to provide and improve our services. You retain ownership of your content and data.
                                </p>

                                <h2>Intellectual Property</h2>
                                <p>
                                    The Service and its original content, features, and functionality are owned by helpNINJA and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                                </p>

                                <h2>Service Availability</h2>
                                <p>
                                    We strive to maintain high availability but do not guarantee uninterrupted service. We may:
                                </p>
                                <ul>
                                    <li>Perform maintenance that temporarily limits access</li>
                                    <li>Experience outages due to technical issues</li>
                                    <li>Modify or discontinue features with notice</li>
                                </ul>

                                <h2>Limitation of Liability</h2>
                                <p>
                                    To the maximum extent permitted by law, helpNINJA shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                                </p>

                                <h2>Indemnification</h2>
                                <p>
                                    You agree to indemnify and hold harmless helpNINJA from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
                                </p>

                                <h2>Termination</h2>
                                <p>
                                    We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
                                </p>

                                <h2>Governing Law</h2>
                                <p>
                                    These Terms shall be interpreted and enforced in accordance with the laws of [Jurisdiction]. Any disputes shall be resolved in the courts of [Jurisdiction].
                                </p>

                                <h2>Changes to Terms</h2>
                                <p>
                                    We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the updated Terms and updating the &quot;Last updated&quot; date.
                                </p>

                                <h2>Contact Information</h2>
                                <p>
                                    If you have any questions about these Terms, please contact us at:
                                </p>
                                <ul>
                                    <li>Email: legal@helpninja.ai</li>
                                    <li>Address: [Company Address]</li>
                                </ul>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                </div>
            </div>
        </AnimatedPage>
    );
}

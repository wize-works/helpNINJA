import Link from 'next/link';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';

export default function PrivacyPolicyPage() {
    return (
        <AnimatedPage>
            <div className="min-h-screen bg-base-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <StaggerContainer>
                        <StaggerChild>
                            <div className="mb-8">
                                <Link href="/" className="btn  btn-sm">
                                    <i className="fa-solid fa-arrow-left mr-2" />
                                    Back to Home
                                </Link>
                            </div>
                        </StaggerChild>

                        <StaggerChild>
                            <div className="prose prose-lg max-w-none">
                                <h1>Privacy Policy</h1>
                                <p className="text-base-content/60">Last updated: {new Date().toLocaleDateString()}</p>

                                <h2>Overview</h2>
                                <p>
                                    This Privacy Policy explains how helpNINJA (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and protects your personal information when you use our AI-powered customer support services. We are committed to protecting your privacy and being transparent about our data practices.
                                </p>

                                <h2>Information We Collect</h2>

                                <h3>Personal Information You Provide</h3>
                                <ul>
                                    <li>Name and email address when you create an account</li>
                                    <li>Payment information when you subscribe to paid plans</li>
                                    <li>Support communications when you contact us</li>
                                    <li>Optional profile information you choose to share</li>
                                </ul>

                                <h3>Automatically Collected Information</h3>
                                <ul>
                                    <li>Usage data about how you use helpNINJA features</li>
                                    <li>Technical information like IP address and browser type</li>
                                    <li>Chat analytics to improve AI performance</li>
                                    <li>Error logs to help us fix technical issues</li>
                                </ul>

                                <h2>How We Use Your Information</h2>
                                <ul>
                                    <li>To provide and improve our services</li>
                                    <li>To process payments and manage your account</li>
                                    <li>To communicate with you about your account and our services</li>
                                    <li>To analyze usage patterns and improve our AI models</li>
                                    <li>To ensure security and prevent fraud</li>
                                </ul>

                                <h2>Information Sharing</h2>
                                <p>
                                    We do not sell your personal information to third parties. We may share your information in the following limited circumstances:
                                </p>
                                <ul>
                                    <li>With service providers who help us operate our business</li>
                                    <li>When required by law or to protect our rights</li>
                                    <li>In connection with a business transaction (merger, acquisition, etc.)</li>
                                    <li>With your explicit consent</li>
                                </ul>

                                <h2>Data Security</h2>
                                <p>
                                    We implement industry-standard security measures to protect your personal information, including:
                                </p>
                                <ul>
                                    <li>Encryption of data in transit and at rest</li>
                                    <li>Regular security audits and monitoring</li>
                                    <li>Access controls and authentication</li>
                                    <li>Secure data centers and infrastructure</li>
                                </ul>

                                <h2>Your Rights</h2>
                                <p>You have the right to:</p>
                                <ul>
                                    <li>Access and review your personal information</li>
                                    <li>Correct or update your information</li>
                                    <li>Delete your account and personal information</li>
                                    <li>Export your data in a portable format</li>
                                    <li>Opt out of marketing communications</li>
                                </ul>

                                <h2>Data Retention</h2>
                                <p>
                                    We retain your personal information for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete your personal information within 30 days, except where retention is required by law.
                                </p>

                                <h2>International Transfers</h2>
                                <p>
                                    Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information during such transfers.
                                </p>

                                <h2>Children&apos;s Privacy</h2>
                                <p>
                                    Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
                                </p>

                                <h2>Changes to This Policy</h2>
                                <p>
                                    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on our website and updating the &quot;Last updated&quot; date.
                                </p>

                                <h2>Contact Us</h2>
                                <p>
                                    If you have any questions about this Privacy Policy or our data practices, please contact us at:
                                </p>
                                <ul>
                                    <li>Email: privacy@helpninja.ai</li>
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

import Link from 'next/link';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';

export default function CookiePolicyPage() {
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
                                <h1>Cookie Policy</h1>
                                <p className="text-base-content/60">Last updated: {new Date().toLocaleDateString()}</p>

                                <h2>What Are Cookies</h2>
                                <p>
                                    Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
                                </p>

                                <h2>How We Use Cookies</h2>
                                <p>
                                    helpNINJA uses cookies and similar technologies to improve your experience on our website and provide our services. We use cookies for:
                                </p>
                                <ul>
                                    <li>Essential functionality (authentication, preferences)</li>
                                    <li>Performance monitoring and analytics</li>
                                    <li>Security and fraud prevention</li>
                                    <li>Service improvement and optimization</li>
                                </ul>

                                <h2>Types of Cookies We Use</h2>

                                <h3>Essential Cookies</h3>
                                <p>
                                    These cookies are necessary for the website to function properly. They enable core functionality such as user authentication, session management, and security features.
                                </p>
                                <ul>
                                    <li><strong>Authentication cookies:</strong> Keep you logged in to your account</li>
                                    <li><strong>Session cookies:</strong> Maintain your session state</li>
                                    <li><strong>Security cookies:</strong> Protect against cross-site request forgery</li>
                                </ul>

                                <h3>Analytics Cookies</h3>
                                <p>
                                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                                </p>
                                <ul>
                                    <li><strong>Usage analytics:</strong> Track page views and user interactions</li>
                                    <li><strong>Performance monitoring:</strong> Monitor website performance and errors</li>
                                    <li><strong>Feature usage:</strong> Understand which features are most popular</li>
                                </ul>

                                <h3>Functional Cookies</h3>
                                <p>
                                    These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
                                </p>
                                <ul>
                                    <li><strong>User preferences:</strong> Remember your language and theme settings</li>
                                    <li><strong>Widget configuration:</strong> Store your chat widget preferences</li>
                                    <li><strong>Dashboard layout:</strong> Remember your dashboard customizations</li>
                                </ul>

                                <h2>Third-Party Cookies</h2>
                                <p>
                                    We may use third-party services that set their own cookies. These include:
                                </p>
                                <ul>
                                    <li><strong>Stripe:</strong> For payment processing and fraud prevention</li>
                                    <li><strong>Microsoft Clarity:</strong> For website analytics and user experience insights</li>
                                    <li><strong>Authentication providers:</strong> For secure user authentication</li>
                                </ul>

                                <h2>Cookie Consent and Control</h2>
                                <p>
                                    You have control over cookies and can:
                                </p>
                                <ul>
                                    <li>Accept or decline non-essential cookies</li>
                                    <li>Withdraw consent at any time</li>
                                    <li>Configure your browser to block or delete cookies</li>
                                    <li>Use our cookie preference center to manage settings</li>
                                </ul>

                                <h2>Browser Settings</h2>
                                <p>
                                    Most web browsers allow you to control cookies through their settings. You can usually find these settings in the &quot;Options&quot; or &quot;Preferences&quot; menu of your browser. Here are links to cookie settings for popular browsers:
                                </p>
                                <ul>
                                    <li>Chrome: Settings &gt; Privacy and security &gt; Cookies</li>
                                    <li>Firefox: Options &gt; Privacy &amp; Security &gt; Cookies</li>
                                    <li>Safari: Preferences &gt; Privacy &gt; Cookies</li>
                                    <li>Edge: Settings &gt; Privacy &gt; Cookies</li>
                                </ul>

                                <h2>Impact of Disabling Cookies</h2>
                                <p>
                                    While you can disable cookies, please note that some features of our website may not function properly without them:
                                </p>
                                <ul>
                                    <li>You may need to log in repeatedly</li>
                                    <li>Your preferences may not be saved</li>
                                    <li>Some features may not work as expected</li>
                                    <li>Analytics data may be incomplete</li>
                                </ul>

                                <h2>Cookie Retention</h2>
                                <p>
                                    Different cookies have different lifespans:
                                </p>
                                <ul>
                                    <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
                                    <li><strong>Persistent cookies:</strong> Remain until they expire or you delete them</li>
                                    <li><strong>Essential cookies:</strong> Typically expire after 1 year</li>
                                    <li><strong>Analytics cookies:</strong> Typically expire after 2 years</li>
                                </ul>

                                <h2>Updates to This Policy</h2>
                                <p>
                                    We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.
                                </p>

                                <h2>Contact Us</h2>
                                <p>
                                    If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
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

import Link from 'next/link';
import { AnimatedPage, StaggerContainer, StaggerChild } from '@/components/ui/animated-page';

export default function DataDeletionPage() {
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
                                <h1>Data Deletion Policy</h1>
                                <p className="text-base-content/60">Last updated: {new Date().toLocaleDateString()}</p>

                                <h2>Your Right to Data Deletion</h2>
                                <p>
                                    At helpNINJA, we respect your privacy and your right to control your personal data. This policy explains how you can request the deletion of your personal information and what happens when you do.
                                </p>

                                <h2>What Data Can Be Deleted</h2>
                                <p>
                                    You can request the deletion of:
                                </p>
                                <ul>
                                    <li>Your account information (name, email, profile details)</li>
                                    <li>Chat conversations and message history</li>
                                    <li>Usage analytics and activity logs</li>
                                    <li>Integration configurations and settings</li>
                                    <li>Payment history (subject to legal retention requirements)</li>
                                    <li>Support communications and tickets</li>
                                </ul>

                                <h2>How to Request Data Deletion</h2>

                                <h3>Self-Service Account Deletion</h3>
                                <p>
                                    You can delete your account and associated data directly from your dashboard:
                                </p>
                                <ol>
                                    <li>Log in to your helpNINJA account</li>
                                    <li>Go to Account Settings &gt; Privacy &amp; Data</li>
                                    <li>Click &quot;Delete Account&quot;</li>
                                    <li>Confirm your decision and provide feedback (optional)</li>
                                    <li>Your data will be deleted within 30 days</li>
                                </ol>

                                <h3>Email Request</h3>
                                <p>
                                    You can also request data deletion by emailing us at:
                                </p>
                                <ul>
                                    <li><strong>Email:</strong> privacy@helpninja.ai</li>
                                    <li><strong>Subject:</strong> Data Deletion Request</li>
                                    <li><strong>Include:</strong> Your account email and specific data you want deleted</li>
                                </ul>

                                <h2>Verification Process</h2>
                                <p>
                                    To protect your privacy and prevent unauthorized deletions, we will verify your identity before processing deletion requests:
                                </p>
                                <ul>
                                    <li>We may ask you to log in to your account</li>
                                    <li>We may send a confirmation email to your registered address</li>
                                    <li>For email requests, we may ask for additional verification</li>
                                </ul>

                                <h2>Deletion Timeline</h2>
                                <p>
                                    Once we receive and verify your deletion request:
                                </p>
                                <ul>
                                    <li><strong>Immediate:</strong> Your account is deactivated and data is marked for deletion</li>
                                    <li><strong>Within 30 days:</strong> All personal data is permanently deleted from our systems</li>
                                    <li><strong>Within 90 days:</strong> Data is removed from backups and archives</li>
                                    <li><strong>Confirmation:</strong> We will email you when deletion is complete</li>
                                </ul>

                                <h2>Data We Cannot Delete</h2>
                                <p>
                                    In some cases, we may be required to retain certain information for legal, regulatory, or business purposes:
                                </p>
                                <ul>
                                    <li>Financial records required for tax and accounting purposes</li>
                                    <li>Legal documents and communications</li>
                                    <li>Security logs needed for fraud prevention</li>
                                    <li>Anonymized analytics data that cannot be attributed to you</li>
                                </ul>

                                <h2>Impact of Data Deletion</h2>
                                <p>
                                    When you delete your data, please be aware that:
                                </p>
                                <ul>
                                    <li>Your account will be permanently closed</li>
                                    <li>You will lose access to all services and features</li>
                                    <li>Chat widgets on your website will stop working</li>
                                    <li>All integrations will be disconnected</li>
                                    <li>Data cannot be recovered after deletion</li>
                                </ul>

                                <h2>Partial Deletion Requests</h2>
                                <p>
                                    If you don&apos;t want to delete your entire account, you can request partial deletion:
                                </p>
                                <ul>
                                    <li><strong>Chat history:</strong> Delete specific conversations or date ranges</li>
                                    <li><strong>Documents:</strong> Remove specific documents from your knowledge base</li>
                                    <li><strong>Analytics:</strong> Clear usage analytics and reporting data</li>
                                    <li><strong>Integrations:</strong> Remove integration history and logs</li>
                                </ul>

                                <h2>Third-Party Data</h2>
                                <p>
                                    Some data may be stored with third-party services. When you request deletion, we will:
                                </p>
                                <ul>
                                    <li>Remove your data from our systems</li>
                                    <li>Request deletion from our service providers</li>
                                    <li>Provide you with information about any third-party data retention</li>
                                </ul>

                                <h2>Customer Data</h2>
                                <p>
                                    If you are a business customer, please note:
                                </p>
                                <ul>
                                    <li>Deleting your account may affect your customers&apos; chat history</li>
                                    <li>You should inform your customers about data deletion</li>
                                    <li>Consider exporting important data before deletion</li>
                                    <li>Team members will lose access to shared data</li>
                                </ul>

                                <h2>Data Export Before Deletion</h2>
                                <p>
                                    Before deleting your data, you may want to export it:
                                </p>
                                <ul>
                                    <li>Go to Account Settings &gt; Data Export</li>
                                    <li>Select the data you want to export</li>
                                    <li>Choose your preferred format (CSV, JSON, PDF)</li>
                                    <li>Download your data</li>
                                </ul>

                                <h2>Questions and Support</h2>
                                <p>
                                    If you have questions about data deletion or need assistance:
                                </p>
                                <ul>
                                    <li><strong>Email:</strong> privacy@helpninja.ai</li>
                                    <li><strong>Support:</strong> support@helpninja.ai</li>
                                    <li><strong>Response time:</strong> Within 48 hours</li>
                                </ul>

                                <h2>Legal Rights</h2>
                                <p>
                                    This policy supports your rights under various privacy laws including GDPR, CCPA, and other applicable regulations. If you believe we have not properly handled your deletion request, you may file a complaint with the relevant data protection authority.
                                </p>
                            </div>
                        </StaggerChild>
                    </StaggerContainer>
                </div>
            </div>
        </AnimatedPage>
    );
}

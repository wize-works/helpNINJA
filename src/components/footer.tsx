import Link from 'next/link';
import Logo from '@/components/logo';

export default function Footer() {
    return (
        <footer className="bg-primary text-primary-content text-2xl">
            <div className="container px-4 py-12 mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="-ms-3 ps-0">
                            <Logo width={200} height={30} color1='text-base-100' color2='text-neutral-content' hoverColor='group-hover:text-base-100' />
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Powerful AI made effortless for customer support. Transform your support experience in 15 minutes.
                        </p>
                    </div>

                    {/* Product */}
                    <div className="space-y-4">
                        <h5 className="font-semibold">Product</h5>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <a href="https://helpninja.ai/features" className="hover:text-primary transition-colors">
                                    Features
                                </a>
                            </li>
                            <li>
                                <a href="https://helpninja.ai/pricing" className="hover:text-primary transition-colors">
                                    Pricing
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary transition-colors">
                                    Security
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary transition-colors">
                                    Integrations
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="space-y-4">
                        <h5 className="font-semibold">Resources</h5>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <a href="https://helpninja.ai/docs/quick-start" className="hover:text-primary transition-colors">
                                    Quick Start Guide
                                </a>
                            </li>
                            <li>
                                <a href="https://helpninja.ai/docs" className="hover:text-primary transition-colors">
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a href="https://helpninja.ai/contact" className="hover:text-primary transition-colors">
                                    Support
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary transition-colors">
                                    Status
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div className="space-y-4">
                        <h5 className="font-semibold">Company</h5>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <a href="https://helpninja.ai/about" className="hover:text-primary transition-colors">
                                    About
                                </a>
                            </li>
                            <li>
                                <a href="https://helpninja.ai/mission" className="hover:text-primary transition-colors">
                                    Mission
                                </a>
                            </li>
                            <li>
                                <a href="https://helpninja.ai/contact" className="hover:text-primary transition-colors">
                                    Careers
                                </a>
                            </li>
                            <li>
                                <a href="https://helpninja.ai/contact" className="hover:text-primary transition-colors">
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <hr className="my-8 border-t border-base-300" />
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-muted-foreground">© 2025 HelpNinja.ai. All rights reserved.</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <a href="https://helpninja.ai/privacy" className="hover:text-primary transition-colors">
                            Privacy Policy
                        </a>
                        <a href="https://helpninja.ai/terms" className="hover:text-primary transition-colors">
                            Terms of Service
                        </a>
                        <a href="https://helpninja.ai/cookies" className="hover:text-primary transition-colors">
                            Cookie Policy
                        </a>
                        <a href="https://helpninja.ai/data-deletion" className="hover:text-primary transition-colors">
                            Data Deletion
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

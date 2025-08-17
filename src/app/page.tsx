import Link from 'next/link';
import Logo from '@/components/logo';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';

export default function Home() {
    return (
        <AnimatedPage>
            <div className="h-[calc(100vh-4rem)] bg-gradient-to-b from-base-200 via-base-200/60 to-base-100">
                <div className="h-full grid lg:grid-cols-2">
                    {/* Left Panel - Sign Up/Sign In */}
                    <div className="flex flex-col justify-center items-center p-8 lg:p-12">
                        <StaggerContainer>
                            <StaggerChild>
                                <div className="w-full max-w-md">
                                    <div className="flex justify-center mb-8">
                                        <Logo size={64} className="text-primary" />
                                    </div>

                                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-center">
                                        Get started with helpNINJA
                                    </h1>

                                    <p className="text-base text-base-content/60 text-center mb-8">
                                        Sign in or create your account. You can be live in under 15 minutes.
                                    </p>

                                    <div className="space-y-3">
                                        <HoverScale scale={1.02}>
                                            <Link href="/auth/signup" className="btn btn-primary btn-lg w-full">
                                                <i className="fa-duotone fa-solid fa-user-plus mr-2" />
                                                Create account
                                            </Link>
                                        </HoverScale>
                                        <HoverScale scale={1.02}>
                                            <Link href="/auth/signin" className="btn btn-outline btn-lg w-full">
                                                <i className="fa-duotone fa-solid fa-right-to-bracket mr-2" />
                                                Sign in
                                            </Link>
                                        </HoverScale>
                                    </div>

                                    <div className="mt-8 text-center text-sm text-base-content/50">
                                        By continuing you agree to our
                                        {' '}
                                        <Link href="https://helpninja.ai/legal/terms" target="_blank" className="link">Terms</Link>
                                        {' '}and{' '}
                                        <Link href="https://helpninja.ai/legal/privacy" target="_blank" className="link">Privacy</Link>.
                                    </div>
                                </div>
                            </StaggerChild>
                        </StaggerContainer>
                    </div>

                    {/* Right Panel - Getting Started Steps */}
                    <div className="card bg-base-100 rounded-2xl shadow-sm flex flex-col justify-center m-4">
                        <StaggerContainer>
                            <StaggerChild>
                                <div className="p-6">
                                    <div className="max-w-lg mx-auto w-full">
                                        <h2 className="text-lg font-semibold text-base-content mb-8 text-center lg:text-left">
                                            Getting set up is simple
                                        </h2>

                                        <div className="space-y-8">
                                            {/* Step 1 */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                    <span className="text-lg font-bold text-primary">1</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-2">Create your account</h3>
                                                    <p className="text-base-content/60 text-sm">We&apos;ll spin up your first tenant automatically—no credit card required.</p>
                                                </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                    <span className="text-lg font-bold text-secondary">2</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-2">Add your website</h3>
                                                    <p className="text-base-content/60 text-sm">Paste your URL or upload docs—our crawler discovers content for you.</p>
                                                </div>
                                            </div>

                                            {/* Step 3 */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                    <span className="text-lg font-bold text-accent">3</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-2">Embed the widget</h3>
                                                    <p className="text-base-content/60 text-sm">Copy one line of code and go live. Complex issues auto‑escalate to your team.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 space-y-3">
                                            <HoverScale scale={1.02}>
                                                <Link href="https://helpninja.ai/features" className="btn btn-primary btn-lg w-full">
                                                    <i className="fa-duotone fa-solid fa-list mr-2" />
                                                    Explore features
                                                </Link>
                                            </HoverScale>
                                            <HoverScale scale={1.02}>
                                                <Link href="https://helpninja.ai/help" target="_blank" className="btn btn-outline btn-lg w-full">
                                                    <i className="fa-duotone fa-solid fa-graduation-cap mr-2" />
                                                    Documentation
                                                </Link>
                                            </HoverScale>
                                        </div>
                                    </div>
                                </div>
                            </StaggerChild>
                        </StaggerContainer>
                    </div>
                </div>
            </div>
        </AnimatedPage>
    );
}

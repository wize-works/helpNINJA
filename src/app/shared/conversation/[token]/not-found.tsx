import Link from 'next/link';
import { AnimatedPage, StaggerContainer, StaggerChild, HoverScale } from '@/components/ui/animated-page';

export default function NotFoundPage() {
    return (
        <AnimatedPage>
            <div className="min-h-screen bg-base-200 flex items-center justify-center px-6">
                <StaggerContainer>
                    <StaggerChild>
                        <div className="card bg-base-100 rounded-2xl shadow-lg p-12 text-center max-w-md">
                            <div className="w-20 h-20 bg-warning/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <i className="fa-duotone fa-solid fa-link-slash text-3xl text-warning" />
                            </div>

                            <h1 className="text-2xl font-bold text-base-content mb-3">
                                Share Link Not Found
                            </h1>

                            <p className="text-base-content/60 mb-6 leading-relaxed">
                                This shared conversation link is either invalid, has expired, or has been revoked.
                                Please check the link or contact the person who shared it with you.
                            </p>

                            <div className="space-y-3">
                                <HoverScale scale={1.02}>
                                    <button
                                        onClick={() => window.history.back()}
                                        className="btn btn-primary rounded-xl w-full"
                                    >
                                        <i className="fa-duotone fa-solid fa-arrow-left mr-2" />
                                        Go Back
                                    </button>
                                </HoverScale>

                                <div className="text-sm text-base-content/60">
                                    or
                                </div>

                                <HoverScale scale={1.02}>
                                    <Link href="https://helpninja.com" className="btn  btn-sm rounded-xl">
                                        <i className="fa-duotone fa-solid fa-globe mr-2" />
                                        Learn about helpNINJA
                                    </Link>
                                </HoverScale>
                            </div>

                            <div className="mt-8 pt-6 border-t border-base-300">
                                <p className="text-xs text-base-content/50">
                                    Share links expire automatically for security.
                                    Contact the conversation owner to request a new link.
                                </p>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>
            </div>
        </AnimatedPage>
    );
}

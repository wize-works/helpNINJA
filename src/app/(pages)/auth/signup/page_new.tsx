"use client";

import { Suspense, useEffect, useState } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useUser, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
    const router = useRouter();
    const { isSignedIn } = useUser();
    const { organization, isLoaded: orgLoaded } = useOrganization();
    const { createOrganization, setActive, isLoaded: orgListLoaded } = useOrganizationList();
    const [orgName, setOrgName] = useState("");
    const [creating, setCreating] = useState(false);
    const [orgError, setOrgError] = useState<string | null>(null);

    useEffect(() => {
        if (isSignedIn && orgLoaded && organization) {
            router.replace("/onboarding/step-1");
        }
    }, [isSignedIn, orgLoaded, organization, router]);

    async function handleCreateOrg(e: React.FormEvent) {
        e.preventDefault();
        if (!orgListLoaded || creating) return;
        setCreating(true);
        setOrgError(null);
        try {
            // Let Clerk auto-generate the slug from the name
            const org = await createOrganization?.({ name: orgName });
            if (org && setActive) {
                await setActive({ organization: org.id });
                router.replace("/onboarding/step-1");
            }
        } catch (err: unknown) {
            const anyErr = err as { errors?: Array<{ message?: string }>; message?: string } | undefined;
            const msg = anyErr?.errors?.[0]?.message || anyErr?.message || "Failed to create workspace";
            setOrgError(msg);
        } finally {
            setCreating(false);
        }
    }

    return (
        <Suspense fallback={null}>
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
                        <p className="text-base-content/60 mb-6">Fast with Google or Microsoft. Email works too.</p>

                        {!isSignedIn && (
                            <SignUp.Root>
                                <SignUp.Step name="start" className="space-y-4">
                                    <Clerk.GlobalError />
                                    <Clerk.Field name="emailAddress" className="fieldset">
                                        <Clerk.Label>What is your email?</Clerk.Label>
                                        <Clerk.Input type="email" className="input w-full" placeholder="you@helpninja.com" />
                                        <Clerk.FieldError />
                                    </Clerk.Field>

                                    <Clerk.Field name="password" className="fieldset">
                                        <Clerk.Label>What do you want your password to be?</Clerk.Label>
                                        <Clerk.Input type="password" className="input w-full" placeholder="••••••••" />
                                        <Clerk.FieldError />
                                    </Clerk.Field>

                                    <SignUp.Action submit className="btn btn-primary w-full">Create Account</SignUp.Action>

                                    <div className="divider">or</div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <Clerk.Connection name="google" className="btn btn-outline"><Clerk.Icon />Google</Clerk.Connection>
                                        <Clerk.Connection name="facebook" className="btn btn-outline"><Clerk.Icon />Facebook</Clerk.Connection>
                                        <Clerk.Connection name="microsoft" className="btn btn-outline"><Clerk.Icon />Microsoft</Clerk.Connection>
                                    </div>

                                    <SignUp.Captcha className="w-full" />

                                    <div className="text-sm text-base-content/60 text-center">
                                        Already have an account? <a className="link link-primary" href="/auth/signin">Sign in</a>
                                    </div>
                                </SignUp.Step>

                                <SignUp.Step name="verifications" className="space-y-4">
                                    <Clerk.GlobalError />
                                    <SignUp.Strategy name="email_code">
                                        <Clerk.Field name="code" className="fieldset">
                                            <Clerk.Label>Enter the code sent to your email</Clerk.Label>
                                            <Clerk.Input inputMode="numeric" className="input input-bordered w-full" placeholder="123456" />
                                            <Clerk.FieldError />
                                        </Clerk.Field>

                                        <SignUp.Action submit className="btn btn-primary w-full">Verify</SignUp.Action>
                                    </SignUp.Strategy>
                                </SignUp.Step>
                            </SignUp.Root>
                        )}

                        {isSignedIn && orgLoaded && !organization && (
                            <div className="mt-6">
                                <div className="divider">
                                    <span>Create your workspace</span>
                                </div>
                                <form onSubmit={handleCreateOrg} className="space-y-4">
                                    {orgError && (
                                        <div className="alert alert-error text-sm">{orgError}</div>
                                    )}
                                    <div className="fieldset">
                                        <label className="label" htmlFor="org-name">Workspace name</label>
                                        <input
                                            id="org-name"
                                            className="input w-full"
                                            placeholder="Acme Inc."
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            required
                                        />
                                        <div className="text-xs text-base-content/60">We&apos;ll create a unique workspace URL for you.</div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full" disabled={creating || !orgListLoaded}>
                                        {creating ? "Creating..." : "Create workspace"}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Suspense>
    );
}

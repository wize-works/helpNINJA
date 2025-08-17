"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Suspense } from "react";

export default function SignInPage() {
    return (
        <Suspense fallback={null}>
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
                        <p className="text-base-content/60 mb-6">Sign in to continue</p>

                        <SignIn.Root>
                            <SignIn.Step name="start" className="space-y-4">
                                <Clerk.Field name="emailAddress">
                                    <fieldset className="fieldset">
                                        <Clerk.Label>What is your email?</Clerk.Label>
                                        <Clerk.Input className="input w-full" placeholder="you@helpninja.com" />
                                        <Clerk.FieldError />
                                    </fieldset>
                                </Clerk.Field>

                                <Clerk.Field name="password" className="fieldset">
                                    <Clerk.Label>What is your password?</Clerk.Label>
                                    <Clerk.Input className="input w-full" placeholder="Ninja Password!" />
                                    <Clerk.FieldError />
                                </Clerk.Field>
                                <SignIn.Action submit className="btn btn-primary w-full">Continue</SignIn.Action>
                                <div className="divider">or</div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Clerk.Connection name="google" className="btn btn-outline"><i className="fa-brands fa-google" />Google</Clerk.Connection>
                                    <Clerk.Connection name="facebook" className="btn btn-outline"><i className="fa-brands fa-facebook" />Facebook</Clerk.Connection>
                                </div>
                                <div className="text-sm text-base-content/60 text-center">
                                    New here? <a className="link link-primary" href="/auth/signup">Create an account</a>
                                </div>
                            </SignIn.Step>
                            <SignIn.Step name="verifications" className="space-y-4">
                                <SignIn.Strategy name="email_code">
                                    <div className="form-control">
                                        <label className="label"><span className="label-text">Email code</span></label>
                                        <Clerk.Input name="code" required className="input input-bordered w-full" placeholder="123456" />
                                    </div>
                                    <SignIn.Action submit className="btn btn-primary w-full">Verify</SignIn.Action>
                                </SignIn.Strategy>
                            </SignIn.Step>
                            {/* Additional steps will render automatically per strategy flow (choose-session, etc.) */}
                        </SignIn.Root>
                    </div>
                </div>
            </div>
        </Suspense>
    );
}

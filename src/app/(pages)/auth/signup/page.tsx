"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { Suspense } from "react";

export default function SignUpPage() {
    return (
        <Suspense fallback={null}>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                    <h1 className="text-2xl font-bold mb-1">Create your account</h1>
                    <p className="text-base-content/60 mb-6">Fast with Google or Microsoft. Email works too.</p>

                    <SignUp.Root>
                        <SignUp.Step name="start" className="space-y-4">
                            <Clerk.GlobalError />
                            <Clerk.Field name="emailAddress" className="fieldset">
                                <Clerk.Label>What is your email?</Clerk.Label>
                                <Clerk.Input className="input w-full" placeholder="you@helpninja.com" />
                                <Clerk.FieldError />
                            </Clerk.Field>

                            <Clerk.Field name="password" className="fieldset">
                                <Clerk.Label>What do you want your password to be?</Clerk.Label>
                                <Clerk.Input className="input w-full" placeholder="Ninja Password!" />
                                <Clerk.FieldError />
                            </Clerk.Field>

                            <SignUp.Action submit className="btn btn-primary w-full">Create Account</SignUp.Action>

                            <div className="divider">or</div>

                            <div className="grid grid-cols-2 gap-3">
                                <Clerk.Connection name="google" className="btn btn-outline"><Clerk.Icon />Google</Clerk.Connection>
                                <Clerk.Connection name="facebook" className="btn btn-outline"><Clerk.Icon />Facebook</Clerk.Connection>
                            </div>

                            {/* <div id="clerk-captcha"></div> */}
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
                                    <Clerk.Input required className="input input-bordered w-full" placeholder="123456" />
                                    <Clerk.FieldError />
                                </Clerk.Field>

                                <SignUp.Action submit className="btn btn-primary w-full">Verify</SignUp.Action>
                            </SignUp.Strategy>
                        </SignUp.Step>
                    </SignUp.Root>
                </div>
            </div>
    </div>
    </Suspense>
    );
}

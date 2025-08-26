"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Suspense, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignInPage() {
    const router = useRouter();
    const { isSignedIn, isLoaded } = useUser();

    // Redirect to dashboard if user is already signed in
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.replace("/dashboard");
        }
    }, [isSignedIn, isLoaded, router]);

    return (
        <Suspense fallback={null}>
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="card bg-base-100 shadow-xl rounded-2xl p-6">
                        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
                        <p className="text-base-content/60 mb-6">Sign in to continue</p>

                        <SignIn.Root>
                            <SignIn.Step name="start" className="space-y-4">
                                <Clerk.GlobalError />
                                <Clerk.Field name="identifier" className="fieldset">
                                    <Clerk.Label>What is your email?</Clerk.Label>
                                    <Clerk.Input className="input w-full" placeholder="you@helpninja.com" />
                                    <Clerk.FieldError />
                                </Clerk.Field>

                                <Clerk.Field name="password" className="fieldset">
                                    <Clerk.Label>What is your password?</Clerk.Label>
                                    <Clerk.Input className="input w-full" placeholder="Ninja Password!" />
                                    <Clerk.FieldError />
                                </Clerk.Field>
                                <SignIn.Action submit className="btn btn-primary w-full rounded-xl">Login</SignIn.Action>

                                <div className="divider">or</div>

                                <div className="grid grid-cols-3 gap-3">
                                    <Clerk.Connection name="google" className="btn btn-outline rounded-xl"><Clerk.Icon />Google</Clerk.Connection>
                                    <Clerk.Connection name="facebook" className="btn btn-outline rounded-xl"><Clerk.Icon />Facebook</Clerk.Connection>
                                    <Clerk.Connection name="microsoft" className="btn btn-outline rounded-xl"><Clerk.Icon />Microsoft</Clerk.Connection>
                                </div>
                                <div className="text-sm text-base-content/60 text-center">
                                    New here? <a className="link link-primary" href="/auth/signup">Create an account</a>
                                </div>
                            </SignIn.Step>
                            <SignIn.Step name="sso-callback">
                                <SignIn.Captcha className="w-full" />
                            </SignIn.Step>
                            <SignIn.Step name="forgot-password" className="space-y-4">
                                <Clerk.GlobalError />
                                <Clerk.Field name="emailAddress" className="fieldset">
                                    <Clerk.Label>Enter your email to reset password</Clerk.Label>
                                    <Clerk.Input className="input w-full" placeholder="hanzo@helpninja.com" />
                                    <Clerk.FieldError />
                                </Clerk.Field>
                                <SignIn.SupportedStrategy name="reset_password_email_code">
                                    Reset password via email.
                                </SignIn.SupportedStrategy>
                                <div className="text-sm text-base-content/60 text-center">
                                    Remembered your password? <a className="link link-primary" href="/auth/signin">Sign in</a>
                                </div>
                            </SignIn.Step>
                            <SignIn.Step name="reset-password" className="space-y-4">
                                <Clerk.GlobalError />
                                <Clerk.Field name="password" className="fieldset">
                                    <Clerk.Label>Enter your new password</Clerk.Label>
                                    <Clerk.Input className="input w-full" placeholder="New Password" type="password" />
                                    <Clerk.FieldError />
                                </Clerk.Field>
                                <Clerk.Field name="confirmPassword" className="fieldset">
                                    <Clerk.Label>Confirm your new password</Clerk.Label>
                                    <Clerk.Input className="input w-full" placeholder="Confirm Password" type="password" />
                                    <Clerk.FieldError />
                                </Clerk.Field>
                                <SignIn.Action submit className="btn btn-primary w-full rounded-xl">Reset Password</SignIn.Action>
                            </SignIn.Step>
                        </SignIn.Root>
                    </div>
                </div>
            </div>
        </Suspense >
    );
}

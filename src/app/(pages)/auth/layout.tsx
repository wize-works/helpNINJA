'use client';
import Logo from "@/components/logo";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Left side: Branding / Info */}
            <div className="hidden md:flex flex-col justify-center items-center bg-base-200 w-1/2 p-12">
                <h2 className="text-3xl font-bold mb-4">Welcome to help<span className="text-primary font-bold">NINJA</span></h2>
                <p className="text-lg text-base-content/70 mb-8 text-center max-w-md">
                    AI-powered support, instant answers, and seamless escalation. Sign up or sign in to get started!
                </p>
                {/* You can add a logo or illustration here */}
                <div className="w-32 h-32 bg-base-300 rounded-full flex items-center justify-center mb-4 group">
                    {/* Placeholder for logo */}
                    <span className="text-4xl font-bold text-primary">
                        <Logo
                            width={200}
                            height={34}
                            className="text-primary group-hover:text-primary transition-all duration-200 group-hover:scale-110"
                        />
                    </span>
                </div>
            </div>
            {/* Right side: Auth form */}
            <div className="flex flex-1 items-center justify-center p-6 bg-primary">
                <div className="w-full">{children}</div>
            </div>
        </div>
    );
}
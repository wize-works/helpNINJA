import { AnimatedPage, StaggerChild, StaggerContainer } from "@/components/ui/animated-page";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import React from "react";
import ProfileForm from "./profile-form";
import EmailAddressesPanel from './components/email-addresses-panel'
import PasswordPanel from './components/password-panel'
import SessionsPanel from './components/sessions-panel'
import ConnectedAccountsPanel from './components/connected-accounts-panel'
import AvatarPanel from './components/avatar-panel'
// Removed embedded Clerk <UserProfile/> panel in favor of native UI (design consistency)
import { revalidatePath } from "next/cache";

export const runtime = 'nodejs'

async function updateProfile(formData: FormData) {
    'use server'
    const { userId } = await auth();
    if (!userId) throw new Error('unauthenticated');
    const firstName = (formData.get('firstName') as string || '').trim().slice(0, 100);
    const lastName = (formData.get('lastName') as string || '').trim().slice(0, 100);
    const clerk = await clerkClient();
    await clerk.users.updateUser(userId, { firstName, lastName });
    // Revalidate the account page route (dashboard scoped)
    revalidatePath('/dashboard/account');
    return { ok: true };
}

export default async function AccountPage() {
    const user = await currentUser();
    const { sessionId } = await auth();
    const breadcrumbItems = [
        { label: "Account", icon: "fa-user" }
    ];
    const emailAddresses = (user?.emailAddresses || []).map(e => ({
        id: e.id,
        emailAddress: e.emailAddress,
        verified: e.verification?.status === 'verified',
        primary: user?.primaryEmailAddressId === e.id
    }));
    interface ExternalAccount { id: string; provider: string }
    const externalAccounts: ExternalAccount[] = (user?.externalAccounts || []).map((e: unknown) => {
        const obj = e as { id?: string; provider?: string }
        return { id: obj.id || 'unknown', provider: obj.provider || 'unknown' }
    });

    return (
        <AnimatedPage>
            <div className="space-y-10">
                <StaggerContainer>
                    <StaggerChild>
                        <Breadcrumb items={breadcrumbItems} />
                    </StaggerChild>
                </StaggerContainer>

                {/* Header */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold text-base-content">Profile Settings</h1>
                                <p className="text-base-content/60 mt-2 max-w-2xl">
                                    Manage your personal information associated with your helpNINJA account.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                                    <i className="fa-duotone fa-solid fa-user text-primary text-2xl" aria-hidden />
                                    <div>
                                        <div className="text-sm text-base-content/60">Signed in as</div>
                                        <div className="font-semibold text-base-content text-sm break-all">{user?.primaryEmailAddress?.emailAddress}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Avatar & Account Portal */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid gap-8 lg:grid-cols-2">
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6 space-y-8">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-id-card text-lg text-primary" aria-hidden />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-base-content">Personal Information</h2>
                                            <p className="text-sm text-base-content/60">Update the details that appear across the product.</p>
                                        </div>
                                    </div>
                                    <ProfileForm initialFirstName={user?.firstName || ''} initialLastName={user?.lastName || ''} action={updateProfile} />
                                </div>
                            </div>
                            <div className="card bg-base-100 rounded-2xl shadow-sm">
                                <div className="p-6 space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
                                            <i className="fa-duotone fa-solid fa-image text-lg text-secondary" aria-hidden />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-base-content">Avatar</h2>
                                            <p className="text-sm text-base-content/60">Your profile photo helps teammates recognize you.</p>
                                        </div>
                                    </div>
                                    <AvatarPanel initialImageUrl={user?.imageUrl || ''} fallbackLetter={(user?.firstName || user?.primaryEmailAddress?.emailAddress || '?').charAt(0).toUpperCase()} />
                                </div>
                            </div>
                        </div>
                    </StaggerChild>
                </StaggerContainer>

                {/* Native Security & Account Management */}
                <StaggerContainer>
                    <StaggerChild>
                        <div className="grid gap-8 lg:grid-cols-2">
                            <EmailAddressesPanel initialEmails={emailAddresses} />
                            <PasswordPanel />
                            <SessionsPanel currentSessionId={sessionId || undefined} />
                            <ConnectedAccountsPanel accounts={externalAccounts} />
                        </div>
                    </StaggerChild>
                </StaggerContainer>

            </div>
        </AnimatedPage>
    );
}

// Client panels imported at top

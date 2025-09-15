import { clerkClient } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

export interface ClerkIntegrationResult {
    success: boolean;
    error?: string;
    userId?: string;
    organizationId?: string;
    created?: boolean;
}

export interface InviteUserToClerkOptions {
    email: string;
    firstName?: string;
    lastName?: string;
    organizationId: string;
    role: 'owner' | 'admin' | 'analyst' | 'support' | 'viewer';
}

/**
 * Map helpNINJA roles to Clerk organization roles
 */
function mapRoleToClerkRole(role: string): 'org:admin' | 'org:member' {
    switch (role) {
        case 'owner':
            return 'org:admin'; // Clerk doesn't have 'owner', use admin
        case 'admin':
            return 'org:admin';
        case 'analyst':
        case 'support':
        case 'viewer':
            return 'org:member';
        default:
            return 'org:member';
    }
}

/**
 * Create a Clerk user account if one doesn't exist
 */
export async function createClerkUserIfNotExists(
    email: string,
    firstName?: string,
    lastName?: string
): Promise<ClerkIntegrationResult> {
    try {
        const clerk = await clerkClient();

        // Check if user already exists in Clerk
        const users = await clerk.users.getUserList({
            emailAddress: [email]
        });

        let userId: string;
        let wasCreated = false;

        if (users.data.length > 0) {
            // User already exists in Clerk
            const existingUser = users.data[0];
            userId = existingUser.id;

            // Update user info if provided and different
            const needsUpdate =
                (firstName && existingUser.firstName !== firstName) ||
                (lastName && existingUser.lastName !== lastName);

            if (needsUpdate) {
                try {
                    await clerk.users.updateUser(existingUser.id, {
                        firstName: firstName || existingUser.firstName || undefined,
                        lastName: lastName || existingUser.lastName || undefined,
                    });
                    console.log(`Updated existing Clerk user: ${existingUser.id}`);
                } catch (updateError) {
                    console.warn('Failed to update existing Clerk user:', updateError);
                    // Don't fail the entire operation for update errors
                }
            }
        } else {
            // Create new Clerk user
            try {
                const newUser = await clerk.users.createUser({
                    emailAddress: [email],
                    firstName: firstName || undefined,
                    lastName: lastName || undefined,
                    skipPasswordRequirement: true, // User will set password during sign-in
                    skipPasswordChecks: true
                });
                userId = newUser.id;
                wasCreated = true;
            } catch (createError) {
                console.error('Error creating new Clerk user:', createError);

                // Handle specific Clerk errors
                if (createError instanceof Error) {
                    if (createError.message.includes('email_address_taken')) {
                        // Race condition - user was created between our check and create
                        const retryUsers = await clerk.users.getUserList({ emailAddress: [email] });
                        if (retryUsers.data.length > 0) {
                            userId = retryUsers.data[0].id;
                            console.log('Found user after race condition');
                        } else {
                            throw createError;
                        }
                    } else if (createError.message.includes('rate_limit')) {
                        throw new Error('Too many requests. Please try again in a few minutes.');
                    } else if (createError.message.includes('invalid_email')) {
                        throw new Error('Invalid email address format.');
                    } else {
                        throw createError;
                    }
                } else {
                    throw createError;
                }
            }
        }

        return {
            success: true,
            userId,
            created: wasCreated
        };
    } catch (error) {
        console.error('Error in createClerkUserIfNotExists:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create Clerk user'
        };
    }
}

/**
 * Add user to Clerk organization with appropriate role
 */
export async function addUserToClerkOrganization(
    userId: string,
    organizationId: string,
    role: string
): Promise<ClerkIntegrationResult> {
    try {
        const clerk = await clerkClient();
        const clerkRole = mapRoleToClerkRole(role);

        // Try to add user to organization
        // If they're already a member, this will fail and we can catch it
        try {
            await clerk.organizations.createOrganizationMembership({
                organizationId,
                userId,
                role: clerkRole
            });
        } catch (membershipError: unknown) {
            // If the error is that they're already a member, try to update their role
            if (membershipError && typeof membershipError === 'object' && 'errors' in membershipError) {
                const errors = (membershipError as { errors?: { code?: string }[] }).errors;
                if (errors?.[0]?.code === 'duplicate_record') {
                    await clerk.organizations.updateOrganizationMembership({
                        organizationId,
                        userId,
                        role: clerkRole
                    });
                } else {
                    throw membershipError;
                }
            } else {
                throw membershipError;
            }
        }

        return {
            success: true,
            userId,
            organizationId
        };
    } catch (error) {
        console.error('Error adding user to Clerk organization:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add user to organization'
        };
    }
}

/**
 * Send Clerk organization invitation (in addition to our custom invitation)
 */
export async function sendClerkOrganizationInvitation(
    organizationId: string,
    email: string,
    role: string
): Promise<ClerkIntegrationResult> {
    try {
        const clerk = await clerkClient();
        const clerkRole = mapRoleToClerkRole(role);

        await clerk.organizations.createOrganizationInvitation({
            organizationId,
            emailAddress: email,
            role: clerkRole
        });

        return {
            success: true,
            organizationId
        };
    } catch (error) {
        console.error('Error sending Clerk organization invitation:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send Clerk invitation'
        };
    }
}

/**
 * Get tenant's Clerk organization ID
 */
export async function getTenantClerkOrganizationId(tenantId: string): Promise<string | null> {
    try {
        const result = await query(
            'SELECT clerk_org_id FROM public.tenants WHERE id = $1',
            [tenantId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].clerk_org_id;
    } catch (error) {
        console.error('Error getting tenant Clerk organization ID:', error);
        return null;
    }
}

/**
 * Complete invitation acceptance flow with Clerk integration
 */
export async function completeInvitationAcceptance(
    email: string,
    tenantId: string,
    role: string,
    firstName?: string,
    lastName?: string
): Promise<ClerkIntegrationResult> {
    try {
        // Get tenant's Clerk organization ID
        const organizationId = await getTenantClerkOrganizationId(tenantId);

        if (!organizationId) {
            return {
                success: false,
                error: 'Tenant organization not found in Clerk'
            };
        }

        // Step 1: Create or get Clerk user
        const userResult = await createClerkUserIfNotExists(email, firstName, lastName);
        if (!userResult.success || !userResult.userId) {
            return userResult;
        }

        // Step 2: Add user to Clerk organization
        const orgResult = await addUserToClerkOrganization(
            userResult.userId,
            organizationId,
            role
        );

        if (!orgResult.success) {
            return orgResult;
        }

        return {
            success: true,
            userId: userResult.userId,
            organizationId
        };
    } catch (error) {
        console.error('Error completing invitation acceptance:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete invitation acceptance'
        };
    }
}

/**
 * Remove user from Clerk organization
 */
export async function removeUserFromClerkOrganization(
    userId: string,
    organizationId: string
): Promise<ClerkIntegrationResult> {
    try {
        const clerk = await clerkClient();
        await clerk.organizations.deleteOrganizationMembership({
            organizationId,
            userId
        });

        return {
            success: true,
            userId,
            organizationId
        };
    } catch (error) {
        console.error('Error removing user from Clerk organization:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove user from organization'
        };
    }
}

/**
 * Update user's role in Clerk organization
 */
export async function updateUserRoleInClerkOrganization(
    userId: string,
    organizationId: string,
    newRole: string
): Promise<ClerkIntegrationResult> {
    try {
        const clerk = await clerkClient();
        const clerkRole = mapRoleToClerkRole(newRole);

        await clerk.organizations.updateOrganizationMembership({
            organizationId,
            userId,
            role: clerkRole
        });

        return {
            success: true,
            userId,
            organizationId
        };
    } catch (error) {
        console.error('Error updating user role in Clerk organization:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update user role'
        };
    }
}

/**
 * Sync tenant members with Clerk organization
 * This can be used for bulk synchronization or recovery
 */
export async function syncTenantWithClerkOrganization(tenantId: string): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
}> {
    try {
        const organizationId = await getTenantClerkOrganizationId(tenantId);

        if (!organizationId) {
            return {
                success: false,
                synced: 0,
                errors: ['Tenant organization not found in Clerk']
            };
        }

        // Get all active tenant members
        const membersResult = await query(`
            SELECT tm.user_id, tm.role, u.email, u.first_name, u.last_name
            FROM public.tenant_members tm
            JOIN public.users u ON u.id = tm.user_id
            WHERE tm.tenant_id = $1 AND tm.status = 'active'
        `, [tenantId]);

        const errors: string[] = [];
        let synced = 0;

        for (const member of membersResult.rows) {
            try {
                // Create Clerk user if needed
                const userResult = await createClerkUserIfNotExists(
                    member.email,
                    member.first_name,
                    member.last_name
                );

                if (userResult.success && userResult.userId) {
                    // Add to organization
                    const orgResult = await addUserToClerkOrganization(
                        userResult.userId,
                        organizationId,
                        member.role
                    );

                    if (orgResult.success) {
                        synced++;
                    } else {
                        errors.push(`Failed to add ${member.email} to organization: ${orgResult.error}`);
                    }
                } else {
                    errors.push(`Failed to create Clerk user for ${member.email}: ${userResult.error}`);
                }
            } catch (error) {
                errors.push(`Error syncing ${member.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return {
            success: errors.length === 0,
            synced,
            errors
        };
    } catch (error) {
        console.error('Error syncing tenant with Clerk organization:', error);
        return {
            success: false,
            synced: 0,
            errors: [error instanceof Error ? error.message : 'Failed to sync tenant']
        };
    }
}
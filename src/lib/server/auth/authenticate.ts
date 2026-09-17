import type { Prisma, User } from '@prisma/client';
import { prisma } from '../db';
import { verifyGoogleCredential, type GoogleStubCredential } from './providers/google';
import type { AuthProvider, VerifiedIdentity } from './types';

export interface AuthResult {
	user: User;
	isNewUser: boolean;
}

// Single entry point for every sign-in flow (CLAUDE.md: "keep auth logic
// behind one interface"). Adding a second provider means adding a case
// here and a verify* function under ./providers — nothing else in the app
// touches provider-specific logic.
export async function authenticate(
	provider: AuthProvider,
	credentials: GoogleStubCredential
): Promise<AuthResult> {
	const identity: VerifiedIdentity =
		provider === 'google'
			? verifyGoogleCredential(credentials)
			: (() => {
					throw new Error(`Unsupported auth provider: ${provider}`);
				})();

	return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
		const existingIdentity = await tx.authIdentity.findUnique({
			where: {
				provider_providerUserId: {
					provider: identity.provider,
					providerUserId: identity.providerUserId
				}
			},
			include: { user: true }
		});

		if (existingIdentity) {
			await tx.authIdentity.update({
				where: { id: existingIdentity.id },
				data: { lastLoginAt: new Date() }
			});
			return { user: existingIdentity.user, isNewUser: false };
		}

		// No identity row yet. Only auto-link to an existing account by email
		// when the provider itself vouches for the address — otherwise an
		// attacker who controls an unverified "email" claim could hijack an
		// existing account just by typing someone else's address.
		const existingUserByEmail =
			identity.email && identity.emailVerified
				? await tx.user.findUnique({ where: { email: identity.email } })
				: null;

		if (existingUserByEmail) {
			await tx.authIdentity.create({
				data: {
					userId: existingUserByEmail.id,
					provider: identity.provider,
					providerUserId: identity.providerUserId
				}
			});
			return { user: existingUserByEmail, isNewUser: false };
		}

		const user = await tx.user.create({
			data: {
				displayName: identity.displayName,
				email: identity.email,
				emailVerified: identity.emailVerified,
				authIdentities: {
					create: {
						provider: identity.provider,
						providerUserId: identity.providerUserId
					}
				}
			}
		});
		return { user, isNewUser: true };
	});
}

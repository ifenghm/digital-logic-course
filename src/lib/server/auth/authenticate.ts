import type { Prisma, User } from '@prisma/client';
import { prisma } from '../db';
import {
	verifyGoogleIdToken,
	verifyGoogleStubCredential,
	type GoogleStubCredential
} from './providers/google';
import type { AuthProvider, VerifiedIdentity } from './types';

export interface AuthResult {
	user: User;
	isNewUser: boolean;
}

// A real Google credential is just the signed ID token string; the stub
// shape is dev-only (see providers/google.ts). Keeping both under one
// GoogleCredential type is what lets authenticate() stay the single entry
// point for every sign-in flow (CLAUDE.md: "keep auth logic behind one
// interface") even though the two flows verify differently. Adding a
// second provider means adding a case here and a verify* function under
// ./providers — nothing else in the app touches provider-specific logic.
export type GoogleCredential = { idToken: string } | GoogleStubCredential;

export async function authenticate(
	provider: AuthProvider,
	credentials: GoogleCredential
): Promise<AuthResult> {
	if (provider !== 'google') {
		throw new Error(`Unsupported auth provider: ${provider}`);
	}
	const identity: VerifiedIdentity =
		'idToken' in credentials
			? await verifyGoogleIdToken(credentials.idToken)
			: verifyGoogleStubCredential(credentials);

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

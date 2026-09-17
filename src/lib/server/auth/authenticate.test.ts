import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { authenticate } from './authenticate';

function uniqueEmail() {
	return `${randomUUID()}@example.com`;
}

describe('authenticate (DB): is the user already in the database?', () => {
	afterAll(async () => {
		await prisma.$disconnect();
	});

	it('creates a new user + auth identity when no one with this Google identity exists yet', async () => {
		const email = uniqueEmail();

		const before = await prisma.user.findUnique({ where: { email } });
		expect(before).toBeNull();

		const { user, isNewUser } = await authenticate('google', { email, displayName: 'New Learner' });

		expect(isNewUser).toBe(true);
		const stored = await prisma.user.findUnique({
			where: { id: user.id },
			include: { authIdentities: true }
		});
		expect(stored).not.toBeNull();
		expect(stored?.email).toBe(email);
		expect(stored?.authIdentities).toHaveLength(1);
		expect(stored?.authIdentities[0]).toMatchObject({ provider: 'google', providerUserId: email });
	});

	it('returns the existing user on a second sign-in instead of creating a duplicate', async () => {
		const email = uniqueEmail();

		const first = await authenticate('google', { email, displayName: 'Returning Learner' });
		const second = await authenticate('google', { email, displayName: 'Returning Learner' });

		expect(second.isNewUser).toBe(false);
		expect(second.user.id).toBe(first.user.id);

		const matchingUsers = await prisma.user.findMany({ where: { email } });
		expect(matchingUsers).toHaveLength(1);
	});

	it('updates lastLoginAt on the auth identity for a returning user', async () => {
		const email = uniqueEmail();
		const { user } = await authenticate('google', { email, displayName: 'Returning Learner' });

		const identityBefore = await prisma.authIdentity.findUnique({
			where: { provider_providerUserId: { provider: 'google', providerUserId: email } }
		});

		await new Promise((resolve) => setTimeout(resolve, 5));
		await authenticate('google', { email, displayName: 'Returning Learner' });

		const identityAfter = await prisma.authIdentity.findUnique({
			where: { provider_providerUserId: { provider: 'google', providerUserId: email } }
		});

		expect(identityAfter?.userId).toBe(user.id);
		expect(identityAfter?.lastLoginAt.getTime()).toBeGreaterThan(identityBefore!.lastLoginAt.getTime());
	});

	it('auto-links a new Google identity to an existing account with the same verified email', async () => {
		const email = uniqueEmail();
		const existingUser = await prisma.user.create({
			data: { displayName: 'Pre-existing Account', email, emailVerified: true }
		});

		const { user, isNewUser } = await authenticate('google', { email, displayName: 'Same Person' });

		expect(isNewUser).toBe(false);
		expect(user.id).toBe(existingUser.id);

		const allUsersWithEmail = await prisma.user.findMany({ where: { email } });
		expect(allUsersWithEmail).toHaveLength(1);
	});
});

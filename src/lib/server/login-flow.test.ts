import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UNIT1_EXERCISE_SLUGS, UNIT1_ID } from '../content/unit1';
import { authenticate } from './auth/authenticate';
import { prisma } from './db';
import {
	getOrCreateProgress,
	markExerciseComplete,
	ownerFromLocals,
	parseLessonsCompleted,
	resolveResumeExercise
} from './progress';

// End-to-end at the service layer (the same functions src/routes/login and
// src/routes/units/[unitId]/+page.server.ts call): does logging in look the
// user up in the database correctly, and does it resume them at the right
// exercise for their actual progress? The HTTP layer on top of this was
// verified manually against a running dev server.
function uniqueEmail() {
	return `${randomUUID()}@example.com`;
}

async function resumeSlugFor(userId: string) {
	const progress = await getOrCreateProgress({ userId }, UNIT1_ID);
	return resolveResumeExercise(UNIT1_EXERCISE_SLUGS, parseLessonsCompleted(progress.lessonsCompleted));
}

describe('login system: DB lookup + progress-based resume', () => {
	beforeAll(async () => {
		await prisma.unit.upsert({
			where: { id: UNIT1_ID },
			update: {},
			create: { id: UNIT1_ID, order: 1, title: 'Truth tables' }
		});
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	it('a brand-new learner (not yet in the database) is created on first sign-in and starts at exercise 1', async () => {
		const email = uniqueEmail();
		expect(await prisma.user.findUnique({ where: { email } })).toBeNull();

		const { user, isNewUser } = await authenticate('google', { email, displayName: 'Brand New' });
		expect(isNewUser).toBe(true);
		expect(await prisma.user.findUnique({ where: { email } })).not.toBeNull();

		expect(await resumeSlugFor(user.id)).toBe(UNIT1_EXERCISE_SLUGS[0]);
	});

	it('a learner already in the database with no progress still starts at exercise 1', async () => {
		const email = uniqueEmail();
		const { user: firstLogin } = await authenticate('google', { email, displayName: 'Someone' });
		const { user: secondLogin, isNewUser } = await authenticate('google', { email, displayName: 'Someone' });

		expect(isNewUser).toBe(false);
		expect(secondLogin.id).toBe(firstLogin.id);
		expect(await resumeSlugFor(secondLogin.id)).toBe(UNIT1_EXERCISE_SLUGS[0]);
	});

	it('a returning learner with one completed exercise resumes at the second exercise, not the first', async () => {
		const email = uniqueEmail();
		const { user } = await authenticate('google', { email, displayName: 'Partway Through' });

		await markExerciseComplete({ userId: user.id }, UNIT1_ID, UNIT1_EXERCISE_SLUGS[0]);

		// Simulate the user coming back and signing in again.
		const { user: returningUser } = await authenticate('google', { email, displayName: 'Partway Through' });
		expect(await resumeSlugFor(returningUser.id)).toBe(UNIT1_EXERCISE_SLUGS[1]);
	});

	it('a learner who completed exercises out of order resumes at the first gap, not the end', async () => {
		const email = uniqueEmail();
		const { user } = await authenticate('google', { email, displayName: 'Out Of Order' });

		await markExerciseComplete({ userId: user.id }, UNIT1_ID, UNIT1_EXERCISE_SLUGS[0]);
		await markExerciseComplete({ userId: user.id }, UNIT1_ID, UNIT1_EXERCISE_SLUGS[2]);

		expect(await resumeSlugFor(user.id)).toBe(UNIT1_EXERCISE_SLUGS[1]);
	});

	it('a learner who finished every exercise resumes at the last one instead of erroring', async () => {
		const email = uniqueEmail();
		const { user } = await authenticate('google', { email, displayName: 'All Done' });

		for (const slug of UNIT1_EXERCISE_SLUGS) {
			await markExerciseComplete({ userId: user.id }, UNIT1_ID, slug);
		}

		expect(await resumeSlugFor(user.id)).toBe(UNIT1_EXERCISE_SLUGS.at(-1));
	});

	it('ownerFromLocals resolves a signed-in request to the user, not a guest', () => {
		const owner = ownerFromLocals({ user: { id: 'user-1' }, guestSessionId: 'guest-1' });
		expect(owner).toEqual({ userId: 'user-1' });
	});

	it('ownerFromLocals resolves an anonymous request to the guest session', () => {
		const owner = ownerFromLocals({ user: null, guestSessionId: 'guest-1' });
		expect(owner).toEqual({ guestSessionId: 'guest-1' });
	});
});

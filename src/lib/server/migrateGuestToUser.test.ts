import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './db';
import { migrateGuestProgressToUser } from './migrateGuestToUser';
import { parseLessonsCompleted, parseQuizScores } from './progress';

const UNIT_ID = 'truth-tables';

async function makeUser() {
	return prisma.user.create({ data: { displayName: 'Learner', email: `${randomUUID()}@example.com` } });
}

async function makeGuestSession() {
	return prisma.guestSession.create({ data: {} });
}

describe('migrateGuestProgressToUser (DB)', () => {
	beforeAll(async () => {
		await prisma.unit.upsert({
			where: { id: UNIT_ID },
			update: {},
			create: { id: UNIT_ID, order: 1, title: 'Truth tables' }
		});
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	it('reassigns the guest progress row to the user when the user has none yet for that unit', async () => {
		const user = await makeUser();
		const guest = await makeGuestSession();
		await prisma.progress.create({
			data: {
				guestSessionId: guest.id,
				unitId: UNIT_ID,
				lessonsCompleted: JSON.stringify(['reading-truth-tables'])
			}
		});

		await migrateGuestProgressToUser(guest.id, user.id);

		const userProgress = await prisma.progress.findUnique({
			where: { userId_unitId: { userId: user.id, unitId: UNIT_ID } }
		});
		expect(parseLessonsCompleted(userProgress?.lessonsCompleted ?? '[]')).toEqual(['reading-truth-tables']);

		const guestProgressRows = await prisma.progress.findMany({ where: { guestSessionId: guest.id } });
		expect(guestProgressRows).toHaveLength(0);
	});

	it('merges (completed stays completed, best score wins) when the user already has progress for that unit', async () => {
		const user = await makeUser();
		const guest = await makeGuestSession();

		await prisma.progress.create({
			data: {
				userId: user.id,
				unitId: UNIT_ID,
				lessonsCompleted: JSON.stringify(['reading-truth-tables']),
				quizScores: JSON.stringify({ 'check-your-understanding': 0.5 })
			}
		});
		await prisma.progress.create({
			data: {
				guestSessionId: guest.id,
				unitId: UNIT_ID,
				lessonsCompleted: JSON.stringify(['and-truth-table']),
				quizScores: JSON.stringify({ 'check-your-understanding': 0.9 })
			}
		});

		await migrateGuestProgressToUser(guest.id, user.id);

		const merged = await prisma.progress.findUnique({
			where: { userId_unitId: { userId: user.id, unitId: UNIT_ID } }
		});
		expect(new Set(parseLessonsCompleted(merged!.lessonsCompleted))).toEqual(
			new Set(['reading-truth-tables', 'and-truth-table'])
		);
		expect(parseQuizScores(merged!.quizScores)).toEqual({ 'check-your-understanding': 0.9 });
	});

	it('consumes the guest session so it cannot be migrated again', async () => {
		const user = await makeUser();
		const guest = await makeGuestSession();

		await migrateGuestProgressToUser(guest.id, user.id);

		const consumedGuest = await prisma.guestSession.findUnique({ where: { id: guest.id } });
		expect(consumedGuest?.consumedAt).not.toBeNull();
	});

	it('is a safe no-op if the guest session was already consumed', async () => {
		const userA = await makeUser();
		const userB = await makeUser();
		const guest = await makeGuestSession();
		await prisma.progress.create({
			data: { guestSessionId: guest.id, unitId: UNIT_ID, lessonsCompleted: JSON.stringify(['and-truth-table']) }
		});

		await migrateGuestProgressToUser(guest.id, userA.id);
		// Second call (e.g. a retried request) must not move anything onto userB.
		await migrateGuestProgressToUser(guest.id, userB.id);

		const userBProgress = await prisma.progress.findUnique({
			where: { userId_unitId: { userId: userB.id, unitId: UNIT_ID } }
		});
		expect(userBProgress).toBeNull();
	});
});

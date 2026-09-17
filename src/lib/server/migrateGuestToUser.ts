import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import {
	mergeLessonsCompleted,
	mergeQuizScores,
	parseLessonsCompleted,
	parseQuizScores,
	serializeLessonsCompleted,
	serializeQuizScores
} from './progress';

// Runs after a guest signs in with Google for the first time. Reassigns the
// guest's progress onto the new account and consumes the guest session, all
// in one transaction: if anything here fails, the guest session and its
// progress rows are untouched (this must never be destructive-then-create —
// see CLAUDE.md "Anonymous -> account migration").
//
// Safe to call even if the guest session was already consumed (e.g. a
// retried request): it's a no-op in that case rather than an error, since
// the caller can't always tell whether a previous attempt already
// committed.
export async function migrateGuestProgressToUser(guestSessionId: string, userId: string): Promise<void> {
	await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
		const guestSession = await tx.guestSession.findUnique({ where: { id: guestSessionId } });
		if (!guestSession || guestSession.consumedAt) return;

		const guestProgressRows = await tx.progress.findMany({ where: { guestSessionId } });

		for (const guestRow of guestProgressRows) {
			const existingUserRow = await tx.progress.findUnique({
				where: { userId_unitId: { userId, unitId: guestRow.unitId } }
			});

			if (!existingUserRow) {
				// No conflicting row for this unit — reassign in place.
				await tx.progress.update({
					where: { id: guestRow.id },
					data: { userId, guestSessionId: null }
				});
				continue;
			}

			// Same unit was attempted both anonymously and (on another device)
			// signed in: merge with "completed lesson stays completed, best
			// quiz score wins," then drop the now-redundant guest row.
			const mergedLessons = mergeLessonsCompleted(
				parseLessonsCompleted(existingUserRow.lessonsCompleted),
				parseLessonsCompleted(guestRow.lessonsCompleted)
			);
			const mergedScores = mergeQuizScores(
				parseQuizScores(existingUserRow.quizScores),
				parseQuizScores(guestRow.quizScores)
			);

			await tx.progress.update({
				where: { id: existingUserRow.id },
				data: {
					lessonsCompleted: serializeLessonsCompleted(mergedLessons),
					quizScores: serializeQuizScores(mergedScores)
				}
			});
			await tx.progress.delete({ where: { id: guestRow.id } });
		}

		await tx.guestSession.update({
			where: { id: guestSessionId },
			data: { consumedAt: new Date() }
		});
	});
}

import type { Progress } from '@prisma/client';
import { prisma } from './db';

// Exactly one of these is set — enforced here, not by the DB (see schema
// comment on the Progress model).
export type ProgressOwner = { userId: string; guestSessionId?: never } | { userId?: never; guestSessionId: string };

function ownerWhere(owner: ProgressOwner, unitId: string) {
	return 'userId' in owner && owner.userId
		? { userId_unitId: { userId: owner.userId, unitId } }
		: { guestSessionId_unitId: { guestSessionId: owner.guestSessionId as string, unitId } };
}

// hooks.server.ts guarantees every request has a signed-in user or an
// active guest session (never neither), so this only throws if it's called
// somewhere that bypassed the hook.
export function ownerFromLocals(locals: {
	user: { id: string } | null;
	guestSessionId: string | null;
}): ProgressOwner {
	if (locals.user) return { userId: locals.user.id };
	if (locals.guestSessionId) return { guestSessionId: locals.guestSessionId };
	throw new Error('Request has neither a signed-in user nor a guest session');
}

export function parseLessonsCompleted(raw: string): string[] {
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) && parsed.every((v) => typeof v === 'string') ? parsed : [];
	} catch {
		return [];
	}
}

export function serializeLessonsCompleted(slugs: string[]): string {
	return JSON.stringify(slugs);
}

export function parseQuizScores(raw: string): Record<string, number> {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return Object.fromEntries(
				Object.entries(parsed).filter(([, v]) => typeof v === 'number')
			) as Record<string, number>;
		}
		return {};
	} catch {
		return {};
	}
}

export function serializeQuizScores(scores: Record<string, number>): string {
	return JSON.stringify(scores);
}

// A completed lesson stays completed, and the best quiz score wins — the
// merge policy CLAUDE.md specifies for both cross-device sync and
// anonymous -> account migration.
export function mergeLessonsCompleted(a: string[], b: string[]): string[] {
	return [...new Set([...a, ...b])];
}

export function mergeQuizScores(
	a: Record<string, number>,
	b: Record<string, number>
): Record<string, number> {
	const merged: Record<string, number> = { ...a };
	for (const [quizId, score] of Object.entries(b)) {
		merged[quizId] = Math.max(merged[quizId] ?? 0, score);
	}
	return merged;
}

// First exercise slug (in unit order) not yet completed, or null if every
// exercise in the unit is done.
export function getNextExercise(orderedSlugs: string[], completedSlugs: string[]): string | null {
	const completed = new Set(completedSlugs);
	return orderedSlugs.find((slug) => !completed.has(slug)) ?? null;
}

// Where /units/[unitId] sends a learner: the next incomplete exercise, or
// (once the whole unit is done) the last one, so "continue" never 404s.
// Assumes `orderedSlugs` is non-empty.
export function resolveResumeExercise(orderedSlugs: string[], completedSlugs: string[]): string {
	return getNextExercise(orderedSlugs, completedSlugs) ?? (orderedSlugs.at(-1) as string);
}

export async function getOrCreateProgress(owner: ProgressOwner, unitId: string): Promise<Progress> {
	const existing = await prisma.progress.findUnique({ where: ownerWhere(owner, unitId) });
	if (existing) return existing;

	return prisma.progress.create({
		data: {
			userId: owner.userId,
			guestSessionId: owner.guestSessionId,
			unitId
		}
	});
}

export async function markExerciseComplete(
	owner: ProgressOwner,
	unitId: string,
	exerciseSlug: string
): Promise<Progress> {
	const progress = await getOrCreateProgress(owner, unitId);
	const completed = parseLessonsCompleted(progress.lessonsCompleted);
	if (completed.includes(exerciseSlug)) return progress;

	return prisma.progress.update({
		where: { id: progress.id },
		data: { lessonsCompleted: serializeLessonsCompleted([...completed, exerciseSlug]) }
	});
}

export async function recordQuizScore(
	owner: ProgressOwner,
	unitId: string,
	quizSlug: string,
	score: number
): Promise<Progress> {
	const progress = await getOrCreateProgress(owner, unitId);
	const scores = parseQuizScores(progress.quizScores);
	const completed = parseLessonsCompleted(progress.lessonsCompleted);

	return prisma.progress.update({
		where: { id: progress.id },
		data: {
			quizScores: serializeQuizScores(mergeQuizScores(scores, { [quizSlug]: score })),
			lessonsCompleted: serializeLessonsCompleted(
				completed.includes(quizSlug) ? completed : [...completed, quizSlug]
			)
		}
	});
}

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from './db';
import {
	getNextExercise,
	getOrCreateProgress,
	markExerciseComplete,
	mergeLessonsCompleted,
	mergeQuizScores,
	parseLessonsCompleted,
	parseQuizScores,
	recordQuizScore,
	resolveResumeExercise
} from './progress';

const EXERCISE_SLUGS = ['reading-truth-tables', 'and-truth-table', 'or-truth-table', 'check-your-understanding'];
const UNIT_ID = 'truth-tables';

describe('getNextExercise (pure)', () => {
	it('returns the first exercise when nothing is completed', () => {
		expect(getNextExercise(EXERCISE_SLUGS, [])).toBe('reading-truth-tables');
	});

	it('returns the first exercise not yet completed', () => {
		expect(getNextExercise(EXERCISE_SLUGS, ['reading-truth-tables'])).toBe('and-truth-table');
	});

	it('skips completed exercises out of order', () => {
		expect(getNextExercise(EXERCISE_SLUGS, ['reading-truth-tables', 'or-truth-table'])).toBe('and-truth-table');
	});

	it('returns null once every exercise is completed', () => {
		expect(getNextExercise(EXERCISE_SLUGS, EXERCISE_SLUGS)).toBeNull();
	});
});

describe('resolveResumeExercise (pure)', () => {
	it('falls back to the last exercise once the unit is fully complete', () => {
		expect(resolveResumeExercise(EXERCISE_SLUGS, EXERCISE_SLUGS)).toBe('check-your-understanding');
	});

	it('otherwise matches getNextExercise', () => {
		expect(resolveResumeExercise(EXERCISE_SLUGS, ['reading-truth-tables'])).toBe('and-truth-table');
	});
});

describe('merge policy (pure): completed stays completed, best score wins', () => {
	it('unions completed lessons without duplicates', () => {
		const merged = mergeLessonsCompleted(['a', 'b'], ['b', 'c']);
		expect(new Set(merged)).toEqual(new Set(['a', 'b', 'c']));
	});

	it('keeps the higher score per quiz when both sides attempted it', () => {
		expect(mergeQuizScores({ quiz1: 0.5 }, { quiz1: 0.8 })).toEqual({ quiz1: 0.8 });
		expect(mergeQuizScores({ quiz1: 0.8 }, { quiz1: 0.5 })).toEqual({ quiz1: 0.8 });
	});

	it('keeps scores that only exist on one side', () => {
		expect(mergeQuizScores({ quiz1: 0.5 }, { quiz2: 0.9 })).toEqual({ quiz1: 0.5, quiz2: 0.9 });
	});
});

describe('lessonsCompleted / quizScores parsing (pure)', () => {
	it('falls back to [] for corrupt or missing JSON', () => {
		expect(parseLessonsCompleted('not json')).toEqual([]);
		expect(parseLessonsCompleted('')).toEqual([]);
		expect(parseLessonsCompleted('{"not":"an array"}')).toEqual([]);
	});

	it('falls back to {} for corrupt or missing JSON', () => {
		expect(parseQuizScores('not json')).toEqual({});
		expect(parseQuizScores('[]')).toEqual({});
	});
});

describe('progress persistence (DB)', () => {
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

	it('creates a fresh progress row with no exercises completed yet', async () => {
		const owner = { guestSessionId: `guest-${randomUUID()}` };
		await prisma.guestSession.create({ data: { id: owner.guestSessionId } });

		const progress = await getOrCreateProgress(owner, UNIT_ID);
		expect(parseLessonsCompleted(progress.lessonsCompleted)).toEqual([]);
	});

	it('marking an exercise complete moves where the learner resumes', async () => {
		const owner = { guestSessionId: `guest-${randomUUID()}` };
		await prisma.guestSession.create({ data: { id: owner.guestSessionId } });

		let progress = await getOrCreateProgress(owner, UNIT_ID);
		expect(resolveResumeExercise(EXERCISE_SLUGS, parseLessonsCompleted(progress.lessonsCompleted))).toBe(
			'reading-truth-tables'
		);

		await markExerciseComplete(owner, UNIT_ID, 'reading-truth-tables');
		progress = await getOrCreateProgress(owner, UNIT_ID);
		expect(resolveResumeExercise(EXERCISE_SLUGS, parseLessonsCompleted(progress.lessonsCompleted))).toBe(
			'and-truth-table'
		);
	});

	it('marking the same exercise complete twice does not duplicate it', async () => {
		const owner = { guestSessionId: `guest-${randomUUID()}` };
		await prisma.guestSession.create({ data: { id: owner.guestSessionId } });

		await markExerciseComplete(owner, UNIT_ID, 'reading-truth-tables');
		const progress = await markExerciseComplete(owner, UNIT_ID, 'reading-truth-tables');
		expect(parseLessonsCompleted(progress.lessonsCompleted)).toEqual(['reading-truth-tables']);
	});

	it('recording a quiz score also marks that exercise complete', async () => {
		const owner = { guestSessionId: `guest-${randomUUID()}` };
		await prisma.guestSession.create({ data: { id: owner.guestSessionId } });

		const progress = await recordQuizScore(owner, UNIT_ID, 'check-your-understanding', 0.75);
		expect(parseQuizScores(progress.quizScores)).toEqual({ 'check-your-understanding': 0.75 });
		expect(parseLessonsCompleted(progress.lessonsCompleted)).toContain('check-your-understanding');
	});
});

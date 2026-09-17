import { error, fail, redirect } from '@sveltejs/kit';
import { getExerciseContent, getUnit } from '$lib/content/units';
import {
	getOrCreateProgress,
	markExerciseComplete,
	ownerFromLocals,
	parseLessonsCompleted,
	parseQuizScores,
	recordQuizScore
} from '$lib/server/progress';
import type { Actions, PageServerLoad } from './$types';

function requireUnitAndExercise(unitId: string, exerciseSlug: string) {
	const unit = getUnit(unitId);
	if (!unit) error(404, 'Unit not found');
	const exercise = getExerciseContent(unitId, exerciseSlug);
	if (!exercise) error(404, 'Exercise not found');
	return { unit, exercise };
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { unit, exercise } = requireUnitAndExercise(params.unitId, params.exercise);

	const owner = ownerFromLocals(locals);
	const progress = await getOrCreateProgress(owner, unit.id);
	const completed = parseLessonsCompleted(progress.lessonsCompleted);
	const quizScores = parseQuizScores(progress.quizScores);

	const index = unit.exerciseSlugs.indexOf(exercise.slug);
	return {
		unit,
		exercise,
		isCompleted: completed.includes(exercise.slug),
		quizScore: quizScores[exercise.slug],
		prevSlug: index > 0 ? unit.exerciseSlugs[index - 1] : null,
		nextSlug: index < unit.exerciseSlugs.length - 1 ? unit.exerciseSlugs[index + 1] : null
	};
};

export const actions: Actions = {
	complete: async ({ params, locals }) => {
		const { unit, exercise } = requireUnitAndExercise(params.unitId, params.exercise);
		const owner = ownerFromLocals(locals);
		await markExerciseComplete(owner, unit.id, exercise.slug);

		const index = unit.exerciseSlugs.indexOf(exercise.slug);
		const nextSlug = unit.exerciseSlugs[index + 1];
		redirect(303, nextSlug ? `/units/${unit.id}/${nextSlug}` : `/units/${unit.id}`);
	},

	checkFillIn: async ({ request, params, locals }) => {
		const { unit, exercise } = requireUnitAndExercise(params.unitId, params.exercise);
		if (exercise.type !== 'fill-in') error(400, 'Not a fill-in exercise');

		const form = await request.formData();
		const wrongRows: number[] = [];
		exercise.rows.forEach((row, i) => {
			const answer = form.get(`row-${i}`);
			if (Number(answer) !== row.expectedOutput) wrongRows.push(i);
		});

		const correct = wrongRows.length === 0;
		if (correct) {
			const owner = ownerFromLocals(locals);
			await markExerciseComplete(owner, unit.id, exercise.slug);
		}

		return correct ? { correct } : fail(400, { correct, wrongRows });
	},

	submitQuiz: async ({ request, params, locals }) => {
		const { unit, exercise } = requireUnitAndExercise(params.unitId, params.exercise);
		if (exercise.type !== 'quiz') error(400, 'Not a quiz exercise');

		const form = await request.formData();
		const results = exercise.questions.map((question, i) => {
			const answer = form.get(`question-${i}`);
			return Number(answer) === question.correctIndex;
		});
		const correctCount = results.filter(Boolean).length;
		const score = correctCount / exercise.questions.length;

		const owner = ownerFromLocals(locals);
		await recordQuizScore(owner, unit.id, exercise.slug, score);

		return { score, correctCount, total: exercise.questions.length, results };
	}
};

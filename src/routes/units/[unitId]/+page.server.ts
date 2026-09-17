import { error, redirect } from '@sveltejs/kit';
import { getUnit } from '$lib/content/units';
import { getOrCreateProgress, ownerFromLocals, parseLessonsCompleted, resolveResumeExercise } from '$lib/server/progress';
import type { PageServerLoad } from './$types';

// Entry point for a unit: resumes the learner at the first exercise they
// haven't completed yet (or the last one, once the whole unit is done).
export const load: PageServerLoad = async ({ params, locals }) => {
	const unit = getUnit(params.unitId);
	if (!unit) error(404, 'Unit not found');
	if (unit.exerciseSlugs.length === 0) error(404, 'Unit has no exercises');

	const owner = ownerFromLocals(locals);
	const progress = await getOrCreateProgress(owner, unit.id);
	const completed = parseLessonsCompleted(progress.lessonsCompleted);
	const nextSlug = resolveResumeExercise(unit.exerciseSlugs, completed);

	redirect(303, `/units/${unit.id}/${nextSlug}`);
};

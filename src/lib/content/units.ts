// Registry of units that exist as real content so far. CLAUDE.md's course
// structure table lists 9 units total, but only Unit 1 has content built —
// listing placeholder rows for the other 8 here would just be dead data
// until they're actually built.
import { getUnit1Exercise, UNIT1_EXERCISE_SLUGS, UNIT1_ID, UNIT1_TITLE, type Unit1Exercise } from './unit1';

export interface UnitRegistration {
	id: string;
	order: number;
	title: string;
	exerciseSlugs: string[];
}

export const UNITS: UnitRegistration[] = [
	{ id: UNIT1_ID, order: 1, title: UNIT1_TITLE, exerciseSlugs: UNIT1_EXERCISE_SLUGS }
];

export function getUnit(unitId: string): UnitRegistration | undefined {
	return UNITS.find((unit) => unit.id === unitId);
}

// Every unit's exercises are a different content shape (see unit1.ts); this
// is the one place that knows how to go from (unitId, slug) to the content
// for that exercise. Adding Unit 2 means adding a case here.
export type UnitExercise = Unit1Exercise;

export function getExerciseContent(unitId: string, slug: string): UnitExercise | undefined {
	if (unitId === UNIT1_ID) return getUnit1Exercise(slug);
	return undefined;
}

// Unit 1 content: truth tables (CLAUDE.md course structure table).
//
// Content lives here as plain data, kept separate from the route/UI code
// that renders it (see CLAUDE.md Conventions). Exercises are ordered — that
// order is what getNextExercise() in src/lib/server/progress.ts walks to
// find where a learner should resume.

export type BitValue = 0 | 1;

interface BaseExercise {
	slug: string;
	title: string;
}

export interface LessonExercise extends BaseExercise {
	type: 'lesson';
	paragraphs: string[];
}

export interface FillInRow {
	inputs: Record<string, BitValue>;
	expectedOutput: BitValue;
}

export interface FillInExercise extends BaseExercise {
	type: 'fill-in';
	paragraphs: string[];
	expression: string;
	variables: string[];
	rows: FillInRow[];
}

export interface QuizQuestion {
	prompt: string;
	options: string[];
	correctIndex: number;
}

export interface QuizExercise extends BaseExercise {
	type: 'quiz';
	questions: QuizQuestion[];
}

export type Unit1Exercise = LessonExercise | FillInExercise | QuizExercise;

export const UNIT1_ID = 'truth-tables';
export const UNIT1_TITLE = 'Truth tables';

export const UNIT1_EXERCISES: Unit1Exercise[] = [
	{
		slug: 'reading-truth-tables',
		title: 'Reading a truth table',
		type: 'lesson',
		paragraphs: [
			'A truth table lists every possible combination of inputs to a logic expression, alongside the output for each one.',
			'Each row is one combination of inputs. With 2 inputs there are 2×2 = 4 rows, because each input can independently be 0 (false) or 1 (true).',
			"We'll write inputs as A, B, C, ... and use 0 for false and 1 for true — the two values a digital circuit can actually represent.",
			'Once you can read a truth table, the next two exercises ask you to build one yourself for AND and OR.'
		]
	},
	{
		slug: 'and-truth-table',
		title: 'Build the truth table for AND',
		type: 'fill-in',
		paragraphs: [
			'A AND B is 1 only when both A and B are 1. Fill in the output for every row.'
		],
		expression: 'A AND B',
		variables: ['A', 'B'],
		rows: [
			{ inputs: { A: 0, B: 0 }, expectedOutput: 0 },
			{ inputs: { A: 0, B: 1 }, expectedOutput: 0 },
			{ inputs: { A: 1, B: 0 }, expectedOutput: 0 },
			{ inputs: { A: 1, B: 1 }, expectedOutput: 1 }
		]
	},
	{
		slug: 'or-truth-table',
		title: 'Build the truth table for OR',
		type: 'fill-in',
		paragraphs: ['A OR B is 1 when at least one of A or B is 1. Fill in the output for every row.'],
		expression: 'A OR B',
		variables: ['A', 'B'],
		rows: [
			{ inputs: { A: 0, B: 0 }, expectedOutput: 0 },
			{ inputs: { A: 0, B: 1 }, expectedOutput: 1 },
			{ inputs: { A: 1, B: 0 }, expectedOutput: 1 },
			{ inputs: { A: 1, B: 1 }, expectedOutput: 1 }
		]
	},
	{
		slug: 'check-your-understanding',
		title: 'Check your understanding',
		type: 'quiz',
		questions: [
			{
				prompt: 'How many rows does a truth table for 3 inputs have?',
				options: ['3', '6', '8', '9'],
				correctIndex: 2
			},
			{
				prompt: 'A AND B is 1 when...',
				options: ['A is 1 or B is 1 (or both)', 'A and B are both 1', 'A and B are both 0', 'A is 1 and B is 0'],
				correctIndex: 1
			},
			{
				prompt: 'A OR B is 0 when...',
				options: ['A and B are both 0', 'A and B are both 1', 'Exactly one of A, B is 1', 'Never'],
				correctIndex: 0
			}
		]
	}
];

export function getUnit1Exercise(slug: string): Unit1Exercise | undefined {
	return UNIT1_EXERCISES.find((exercise) => exercise.slug === slug);
}

export const UNIT1_EXERCISE_SLUGS = UNIT1_EXERCISES.map((exercise) => exercise.slug);

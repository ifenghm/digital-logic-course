<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const fillInResult = $derived(form && 'correct' in form ? form : null);
	const quizResult = $derived(form && 'score' in form ? form : null);
</script>

<p class="breadcrumb"><a href="/units/{data.unit.id}">{data.unit.title}</a></p>
<h1>
	{data.exercise.title}
	{#if data.isCompleted}<span class="badge">✓ Completed</span>{/if}
</h1>

{#if data.exercise.type === 'lesson'}
	{#each data.exercise.paragraphs as paragraph (paragraph)}
		<p>{paragraph}</p>
	{/each}
	<form method="post" action="?/complete" use:enhance>
		<button type="submit">Mark as read &amp; continue</button>
	</form>
{:else if data.exercise.type === 'fill-in'}
	{#each data.exercise.paragraphs as paragraph (paragraph)}
		<p>{paragraph}</p>
	{/each}
	<form method="post" action="?/checkFillIn" use:enhance>
		<table>
			<caption>Truth table for {data.exercise.expression}</caption>
			<thead>
				<tr>
					{#each data.exercise.variables as variable (variable)}
						<th scope="col">{variable}</th>
					{/each}
					<th scope="col">Output</th>
				</tr>
			</thead>
			<tbody>
				{#each data.exercise.rows as row, i (i)}
					<tr class:wrong={fillInResult?.wrongRows?.includes(i)}>
						{#each data.exercise.variables as variable (variable)}
							<td>{row.inputs[variable]}</td>
						{/each}
						<td>
							<label class="sr-only" for="row-{i}">Output for row {i + 1}</label>
							<select id="row-{i}" name="row-{i}">
								<option value="0">0</option>
								<option value="1">1</option>
							</select>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<button type="submit">Check answers</button>
		{#if fillInResult}
			{#if fillInResult.correct}
				<p class="success" role="status">All correct!</p>
			{:else}
				<p class="error" role="alert">
					{fillInResult.wrongRows?.length} row(s) aren't right yet — highlighted above.
				</p>
			{/if}
		{/if}
	</form>
{:else if data.exercise.type === 'quiz'}
	<form method="post" action="?/submitQuiz" use:enhance>
		{#each data.exercise.questions as question, qi (qi)}
			<fieldset>
				<legend>{question.prompt}</legend>
				{#each question.options as option, oi (oi)}
					<label class="option">
						<input type="radio" name="question-{qi}" value={oi} required />
						{option}
					</label>
				{/each}
				{#if quizResult}
					{@const questionCorrect = quizResult.results?.[qi] ?? false}
					<p class:success={questionCorrect} class:error={!questionCorrect}>
						{questionCorrect ? 'Correct' : 'Not quite'}
					</p>
				{/if}
			</fieldset>
		{/each}
		<button type="submit">Submit quiz</button>
		{#if quizResult}
			<p class="success" role="status">
				Score: {quizResult.correctCount} / {quizResult.total}
			</p>
		{/if}
	</form>
{/if}

<nav class="exercise-nav">
	{#if data.prevSlug}
		<a href="/units/{data.unit.id}/{data.prevSlug}">&larr; Previous</a>
	{:else}
		<span></span>
	{/if}
	{#if (data.exercise.type === 'quiz' && quizResult) || data.isCompleted}
		{#if data.nextSlug}
			<a href="/units/{data.unit.id}/{data.nextSlug}">Next &rarr;</a>
		{:else}
			<a href="/units/{data.unit.id}">Back to unit</a>
		{/if}
	{/if}
</nav>

<style>
	.breadcrumb {
		margin-bottom: 0;
	}

	.badge {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a7a3d;
		margin-left: 0.5rem;
	}

	table {
		border-collapse: collapse;
		margin: 1.5rem 0;
	}

	caption {
		text-align: left;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	th,
	td {
		border: 1px solid #ccc;
		padding: 0.5rem 1rem;
		text-align: center;
	}

	tr.wrong td {
		background: #fdecea;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
	}

	fieldset {
		border: 1px solid #ddd;
		border-radius: 0.375rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.option {
		display: block;
		margin: 0.375rem 0;
	}

	button {
		font: inherit;
		font-weight: 600;
		padding: 0.625rem 1rem;
		background: #1a5fb4;
		color: #fff;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	button:hover {
		background: #154a8f;
	}

	.success {
		color: #1a7a3d;
		font-weight: 600;
	}

	.error {
		color: #b3261e;
		font-weight: 600;
	}

	.exercise-nav {
		display: flex;
		justify-content: space-between;
		margin-top: 2rem;
	}
</style>

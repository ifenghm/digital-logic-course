<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import ChevronSelect from '$lib/components/ChevronSelect.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const fillInResult = $derived(form && 'correct' in form ? form : null);
	const quizResult = $derived(form && 'score' in form ? form : null);

	const binaryOptions = [
		{ value: '0', label: '0' },
		{ value: '1', label: '1' }
	];
</script>

<p class="breadcrumb">{data.unit.title}</p>
<p class="back-link"><a href="/">&larr; Back to course</a></p>
<h1>
	{data.exercise.title}
	{#if data.isCompleted}
		<span class="badge" transition:fly={{ y: -6, duration: 400 }}>✓ Completed</span>
	{/if}
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
							<ChevronSelect
								id="row-{i}"
								name="row-{i}"
								label="Output for row {i + 1}"
								options={binaryOptions}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<button type="submit">Check answers</button>
		{#if fillInResult}
			{#if fillInResult.correct}
				<p class="success" role="status" transition:fly={{ y: 8, duration: 400 }}>
					All correct!
				</p>
			{:else}
				<p class="error" role="alert" transition:fly={{ y: 8, duration: 400 }}>
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
					<p
						class:success={questionCorrect}
						class:error={!questionCorrect}
						transition:fly={{ x: 8, duration: 400 }}
					>
						{questionCorrect ? 'Correct' : 'Not quite'}
					</p>
				{/if}
			</fieldset>
		{/each}
		<button type="submit">Submit quiz</button>
		{#if quizResult}
			<p class="success" role="status" transition:fly={{ y: 8, duration: 400 }}>
				Score: {quizResult.correctCount} / {quizResult.total}
			</p>
		{/if}
	</form>
{/if}

<nav class="exercise-nav">
	{#if data.prevSlug}
		<a href="/units/{data.unit.id}/{data.prevSlug}" out:fly={{ x: -24, duration: 300 }}
			>&larr; Previous</a
		>
	{:else}
		<span></span>
	{/if}
	{#if ((data.exercise.type === 'quiz' && quizResult) || data.isCompleted) && data.nextSlug}
		<a href="/units/{data.unit.id}/{data.nextSlug}" out:fly={{ x: 24, duration: 300 }}
			>Next &rarr;</a
		>
	{/if}
</nav>

<style>
	.breadcrumb {
		margin-bottom: 0;
		font-size: 2rem;
		font-weight: 600;
	}

	.back-link {
		margin-top: 0.25rem;
	}

	.back-link a {
		font-size: 0.875rem;
	}

	.badge {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--success);
		margin-left: 0.5rem;
		transition: color 550ms ease;
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
		border: 1px solid var(--border-strong);
		padding: 0.5rem 1rem;
		text-align: center;
		transition:
			border-color 550ms ease,
			background-color 550ms ease;
	}

	tr.wrong td {
		background: var(--error-bg);
	}

	fieldset {
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 1rem;
		margin-bottom: 1rem;
		transition: border-color 550ms ease;
	}

	.option {
		display: block;
		margin: 0.375rem 0;
	}

	button {
		font: inherit;
		font-weight: 600;
		padding: 0.625rem 1rem;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 400ms ease;
	}

	button:hover {
		background: var(--accent-hover);
	}

	.success {
		color: var(--success);
		font-weight: 600;
		transition: color 550ms ease;
	}

	.error {
		color: var(--error);
		font-weight: 600;
		transition: color 550ms ease;
	}

	.exercise-nav {
		display: flex;
		justify-content: space-between;
		margin-top: 2rem;
	}

</style>

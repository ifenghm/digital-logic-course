<script lang="ts">
	import { enhance } from '$app/forms';
	import CircuitCanvas from '$lib/components/CircuitCanvas.svelte';
	import { emptyGraph, type CircuitGraph } from '$lib/circuits/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let graph = $state<CircuitGraph>(emptyGraph());
	let title = $state('Untitled circuit');
	let graphJson = $derived(JSON.stringify(graph));
</script>

<p class="back-link"><a href="/circuits">&larr; Your circuits</a></p>
<h1>New circuit</h1>

<CircuitCanvas bind:graph />

{#if data.user}
	<form method="post" action="?/create" use:enhance class="save-bar">
		<label for="title">Title</label>
		<input id="title" name="title" bind:value={title} maxlength="80" />
		<input type="hidden" name="graph" value={graphJson} />
		<button type="submit">Save circuit</button>
	</form>
{:else}
	<p class="signin-prompt"><a href="/login">Sign in</a> to save this circuit and get a shareable link.</p>
{/if}

{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

<style>
	.back-link {
		margin-top: 0.25rem;
	}

	.back-link a {
		font-size: 0.875rem;
	}

	h1 {
		margin-bottom: 1rem;
	}

	.save-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.save-bar label {
		font-weight: 600;
	}

	.save-bar input[type='text'],
	.save-bar input:not([type]) {
		font: inherit;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: 0.375rem;
		background: var(--surface);
		color: var(--text);
		flex: 1;
		max-width: 20rem;
		transition:
			background-color 550ms ease,
			border-color 550ms ease,
			color 550ms ease;
	}

	.save-bar button {
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

	.save-bar button:hover {
		background: var(--accent-hover);
	}

	.signin-prompt {
		margin-top: 1.5rem;
		color: var(--text-muted);
	}

	.error {
		color: var(--error);
		font-weight: 600;
		margin-top: 0.75rem;
		transition: color 550ms ease;
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import CircuitCanvas from '$lib/components/CircuitCanvas.svelte';
	import type { CircuitGraph } from '$lib/circuits/types';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let graph = $state<CircuitGraph>(structuredClone(data.graph));
	let title = $state(data.title);
	let graphJson = $derived(JSON.stringify(graph));
	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(page.url.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard API unavailable (e.g. insecure context) — the link is
			// still visible in the share box for manual copying.
		}
	}
</script>

<p class="back-link"><a href="/circuits">&larr; Your circuits</a></p>

{#if data.isOwner}
	<h1>Edit circuit</h1>
{:else}
	<h1>{data.title}</h1>
	<p class="readonly-note">Viewing a shared circuit (read-only).</p>
{/if}

<CircuitCanvas bind:graph readOnly={!data.isOwner} />

{#if data.isOwner}
	<div class="share-box">
		<label for="share-link">Shareable link</label>
		<input id="share-link" type="text" readonly value={page.url.href} onclick={(e) => (e.currentTarget as HTMLInputElement).select()} />
		<button type="button" onclick={copyLink}>{copied ? 'Copied!' : 'Copy link'}</button>
	</div>

	<form method="post" action="?/save" use:enhance class="save-bar">
		<label for="title">Title</label>
		<input id="title" name="title" bind:value={title} maxlength="80" />
		<input type="hidden" name="graph" value={graphJson} />
		<button type="submit">Save changes</button>
	</form>
	{#if form && 'saved' in form}
		<p class="success" role="status">Saved.</p>
	{/if}

	<form method="post" action="?/delete" use:enhance class="delete-bar">
		<button type="submit" class="danger">Delete circuit</button>
	</form>
{:else if data.canFork}
	<form method="post" action="?/fork" use:enhance class="fork-bar">
		<button type="submit">Copy &amp; edit this circuit</button>
	</form>
{:else}
	<p class="signin-prompt"><a href="/login">Sign in</a> to make your own copy of this circuit.</p>
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

	.readonly-note {
		color: var(--text-muted);
		margin-top: -0.5rem;
	}

	.share-box {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.share-box label {
		font-weight: 600;
	}

	.share-box input {
		font: inherit;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: 0.375rem;
		background: var(--surface);
		color: var(--text-muted);
		flex: 1;
		max-width: 24rem;
		transition:
			background-color 550ms ease,
			border-color 550ms ease;
	}

	.save-bar,
	.fork-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.save-bar label {
		font-weight: 600;
	}

	.save-bar input:not([type='hidden']) {
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

	.share-box button,
	.save-bar button,
	.fork-bar button {
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

	.share-box button:hover,
	.save-bar button:hover,
	.fork-bar button:hover {
		background: var(--accent-hover);
	}

	.delete-bar {
		margin-top: 1.5rem;
	}

	.danger {
		font: inherit;
		padding: 0.5rem 0.875rem;
		background: transparent;
		color: var(--error);
		border: 1px solid var(--error);
		border-radius: 0.375rem;
		cursor: pointer;
		transition:
			background-color 200ms ease,
			color 550ms ease,
			border-color 550ms ease;
	}

	.danger:hover {
		background: var(--error-bg);
	}

	.signin-prompt {
		margin-top: 1.5rem;
		color: var(--text-muted);
	}

	.success {
		color: var(--success);
		font-weight: 600;
		margin-top: 0.75rem;
		transition: color 550ms ease;
	}

	.error {
		color: var(--error);
		font-weight: 600;
		margin-top: 0.75rem;
		transition: color 550ms ease;
	}
</style>

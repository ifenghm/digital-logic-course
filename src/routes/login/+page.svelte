<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<h1>Sign in</h1>

<p class="stub-notice">
	Real Google Sign-In isn't wired up yet (no OAuth client ID/secret configured). This form stands
	in for it: type an email and it signs you in as that Google account. Using the same email again
	logs back into the same account.
</p>

<form method="post" use:enhance>
	<label>
		Email
		<input type="email" name="email" required autocomplete="email" />
	</label>
	<label>
		Display name
		<input type="text" name="displayName" autocomplete="name" placeholder="Optional" />
	</label>
	{#if form?.error}
		<p class="error" role="alert" transition:fly={{ y: 8, duration: 400 }}>{form.error}</p>
	{/if}
	<button type="submit">Continue with Google (dev stub)</button>
</form>

<style>
	.stub-notice {
		background: var(--warn-bg);
		border: 1px solid var(--warn-border);
		border-radius: 0.375rem;
		padding: 0.75rem 1rem;
		color: var(--warn-text);
		transition:
			background-color 550ms ease,
			border-color 550ms ease,
			color 550ms ease;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 24rem;
		margin-top: 1.5rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 600;
	}

	input {
		font: inherit;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--border-strong);
		border-radius: 0.375rem;
		background: var(--surface);
		color: var(--text);
		transition:
			border-color 550ms ease,
			background-color 550ms ease,
			color 550ms ease;
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

	.error {
		color: var(--error);
		margin: 0;
		transition: color 550ms ease;
	}
</style>

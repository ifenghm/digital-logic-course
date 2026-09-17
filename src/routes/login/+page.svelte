<script lang="ts">
	import { enhance } from '$app/forms';
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
		<p class="error" role="alert">{form.error}</p>
	{/if}
	<button type="submit">Continue with Google (dev stub)</button>
</form>

<style>
	.stub-notice {
		background: #fff7e0;
		border: 1px solid #e8d8a0;
		border-radius: 0.375rem;
		padding: 0.75rem 1rem;
		color: #6b5900;
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
		border: 1px solid #ccc;
		border-radius: 0.375rem;
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

	.error {
		color: #b3261e;
		margin: 0;
	}
</style>

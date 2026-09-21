<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const clientId = env.PUBLIC_GOOGLE_CLIENT_ID;

	let googleForm: HTMLFormElement | undefined = $state();
	let idTokenInput: HTMLInputElement | undefined = $state();
	let buttonEl: HTMLDivElement | undefined = $state();

	interface GoogleIdentityServices {
		accounts: {
			id: {
				initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
				renderButton: (parent: HTMLElement, options: { theme: string; size: string }) => void;
			};
		};
	}

	// Loads Google's Identity Services library and renders its own "Sign in
	// with Google" button into `buttonEl`. The library hands back a signed
	// ID token (a JWT) via `callback`, which we drop into a hidden field and
	// submit through the normal form action — verification happens
	// server-side in src/lib/server/auth/providers/google.ts.
	onMount(() => {
		if (!clientId) return;

		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.onload = () => {
			const google = (window as unknown as { google: GoogleIdentityServices }).google;
			google.accounts.id.initialize({
				client_id: clientId,
				callback: (response) => {
					// Write straight to the DOM node rather than through a
					// `$state` binding: this callback runs from Google's own
					// library, not a Svelte-managed event, so a reactive
					// update here wouldn't be guaranteed to flush to the
					// input's `value` before the synchronous
					// `requestSubmit()` below reads it — submitting a stale
					// (empty) token.
					if (idTokenInput) idTokenInput.value = response.credential;
					googleForm?.requestSubmit();
				}
			});
			if (buttonEl) google.accounts.id.renderButton(buttonEl, { theme: 'outline', size: 'large' });
		};
		document.head.appendChild(script);
	});
</script>

<h1>Sign in</h1>

{#if clientId}
	<div bind:this={buttonEl}></div>
	<form method="post" action="?/google" bind:this={googleForm} use:enhance>
		<input type="hidden" name="idToken" bind:this={idTokenInput} />
	</form>
	{#if form?.error}
		<p class="error" role="alert" transition:fly={{ y: 8, duration: 400 }}>{form.error}</p>
	{/if}
{:else}
	<p class="stub-notice">
		Real Google Sign-In isn't wired up yet (no <code>PUBLIC_GOOGLE_CLIENT_ID</code> configured).
		This form stands in for it: type an email and it signs you in as that Google account. Using
		the same email again logs back into the same account.
	</p>

	<form method="post" action="?/stub" use:enhance>
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
{/if}

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

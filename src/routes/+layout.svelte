<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header>
		<a class="brand" href="/">Digital Logic</a>
		<nav>
			{#if data.user}
				<span class="who">{data.user.displayName}</span>
				<form method="post" action="/logout">
					<button type="submit" class="link-button">Sign out</button>
				</form>
			{:else}
				<a href="/login">Sign in</a>
			{/if}
		</nav>
	</header>

	{#key page.url.pathname}
		<main in:fly={{ y: 10, duration: 220, delay: 120 }} out:fly={{ y: -10, duration: 120 }}>
			{@render children()}
		</main>
	{/key}
</div>

<style>
	:global(html) {
		color-scheme: light;
	}

	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		background: #fafafa;
		color: #1a1a1a;
	}

	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e2e2e2;
		background: #fff;
	}

	.brand {
		font-weight: 700;
		text-decoration: none;
		color: #1a1a1a;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.who {
		color: #555;
	}

	.link-button {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: #1a5fb4;
		cursor: pointer;
		text-decoration: underline;
	}

	main {
		flex: 1;
		max-width: 48rem;
		width: 100%;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		box-sizing: border-box;
	}
</style>

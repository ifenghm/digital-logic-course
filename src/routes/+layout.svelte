<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';

	let { children, data } = $props();

	function readStoredTheme(): 'light' | 'dark' | null {
		try {
			const stored = localStorage.getItem('theme');
			return stored === 'dark' || stored === 'light' ? stored : null;
		} catch {
			return null;
		}
	}

	// app.html's inline script already set this on <html> before hydration,
	// so read it back instead of guessing again and risking a mismatch.
	function getInitialTheme(): 'light' | 'dark' {
		if (typeof document !== 'undefined') {
			const attr = document.documentElement.dataset.theme;
			if (attr === 'dark' || attr === 'light') return attr;
		}
		return readStoredTheme() ?? 'light';
	}

	let theme = $state<'light' | 'dark'>(getInitialTheme());
	let menuOpen = $state(false);
	let accountMenuEl: HTMLDivElement | undefined = $state();

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// Private browsing / blocked storage — theme just won't persist.
		}
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	$effect(() => {
		if (!menuOpen) return;
		function handleOutsideClick(event: MouseEvent) {
			if (event.target instanceof Node && !accountMenuEl?.contains(event.target)) {
				menuOpen = false;
			}
		}
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') menuOpen = false;
		}
		document.addEventListener('click', handleOutsideClick);
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
	<header>
		<a class="brand" href="/">Digital Logic</a>
		<nav>
			<a href="/circuits/new">Circuit builder</a>
			<button
				type="button"
				class="theme-toggle"
				onclick={toggleTheme}
				aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
			>
				{theme === 'dark' ? '☀️' : '🌙'}
			</button>
			{#if data.user}
				<div class="account-menu" bind:this={accountMenuEl}>
					<button
						type="button"
						class="account-trigger"
						onclick={toggleMenu}
						aria-expanded={menuOpen}
						aria-haspopup="true"
					>
						<span class="who">{data.user.displayName}</span>
						<svg
							class="chevron"
							class:open={menuOpen}
							aria-hidden="true"
							viewBox="0 0 16 16"
							width="12"
							height="12"
						>
							<path
								d="M4 6l4 4 4-4"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					{#if menuOpen}
						<div class="account-panel" transition:fly={{ y: -6, duration: 300 }}>
							<form method="post" action="/logout" onsubmit={closeMenu}>
								<button type="submit" class="link-button">Sign out</button>
							</form>
						</div>
					{/if}
				</div>
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
	:global(:root) {
		--bg: #fafafa;
		--surface: #ffffff;
		--text: #1a1a1a;
		--text-muted: #555555;
		--border: #e2e2e2;
		--border-strong: #cccccc;
		--accent: #1a5fb4;
		--accent-hover: #154a8f;
		--link: #c2410c;
		--link-visited: #4b5563;
		--success: #1a7a3d;
		--error: #b3261e;
		--error-bg: #fdecea;
		--warn-bg: #fff7e0;
		--warn-border: #e8d8a0;
		--warn-text: #6b5900;
		--shadow: rgb(0 0 0 / 0.1);
	}

	:global(html[data-theme='dark']) {
		--bg: #17181c;
		--surface: #212226;
		--text: #eceef1;
		--text-muted: #a7abb3;
		--border: #34363c;
		--border-strong: #45484f;
		--accent: #6fa8f5;
		--accent-hover: #8fbdf7;
		--link: #fb923c;
		--link-visited: #9ca3af;
		--success: #5fd489;
		--error: #ff8a80;
		--error-bg: #3a2223;
		--warn-bg: #3a331a;
		--warn-border: #665a29;
		--warn-text: #e3c878;
		--shadow: rgb(0 0 0 / 0.4);
	}

	:global(html) {
		color-scheme: light;
	}

	:global(html[data-theme='dark']) {
		color-scheme: dark;
	}

	:global(body) {
		margin: 0;
		font-family:
			'Atkinson Hyperlegible',
			system-ui,
			-apple-system,
			'Segoe UI',
			sans-serif;
		background: var(--bg);
		color: var(--text);
		transition:
			background-color 550ms ease,
			color 550ms ease;
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
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		transition:
			background-color 550ms ease,
			border-color 550ms ease;
	}

	.brand {
		font-size: 3rem;
		font-weight: 700;
		text-decoration: none;
		color: var(--text);
		transition: color 550ms ease;
	}

	:global(a:link:not(.cta, .brand)) {
		color: var(--link);
		transition: color 550ms ease;
	}

	:global(a:visited:not(.cta, .brand)) {
		color: var(--link-visited);
		transition: color 550ms ease;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.theme-toggle {
		background: none;
		border: 1px solid var(--border);
		border-radius: 999px;
		width: 2.25rem;
		height: 2.25rem;
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		transition:
			border-color 550ms ease,
			background-color 550ms ease,
			transform 300ms ease;
	}

	.theme-toggle:hover {
		transform: rotate(15deg);
	}

	.account-menu {
		position: relative;
	}

	.account-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background: none;
		border: none;
		font: inherit;
		padding: 0;
		cursor: pointer;
	}

	.who {
		color: var(--text-muted);
		transition: color 550ms ease;
	}

	.chevron {
		display: inline-block;
		color: var(--text-muted);
		transition:
			transform 400ms ease,
			color 550ms ease;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.account-panel {
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: 0.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		padding: 0.5rem;
		box-shadow: 0 4px 12px var(--shadow);
		transition:
			background-color 550ms ease,
			border-color 550ms ease;
	}

	.link-button {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: var(--link);
		cursor: pointer;
		text-decoration: underline;
		transition: color 550ms ease;
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

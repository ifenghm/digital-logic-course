import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Hosted on Vercel (free/Hobby tier) — see DEPLOYMENT.md. Was
			// adapter-auto during development; pinned to adapter-vercel
			// directly once the platform was decided, per SvelteKit's own
			// recommendation (skips adapter-auto's install-on-first-build step).
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					globalSetup: ['./vitest-setup/global-setup.ts'],
					setupFiles: ['./vitest-setup/setup.ts'],
					// DB-backed tests share one SQLite file; running them
					// concurrently would race on writes to it.
					fileParallelism: false
				}
			}
		]
	}
});

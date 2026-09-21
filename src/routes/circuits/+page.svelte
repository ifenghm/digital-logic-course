<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<p class="back-link"><a href="/">&larr; Back to course</a></p>
<h1>Your circuits</h1>
<a class="cta" href="/circuits/new">+ New circuit</a>

{#if data.circuits.length === 0}
	<p class="empty">You have not saved any circuits yet.</p>
{:else}
	<ul class="circuit-list">
		{#each data.circuits as circuit (circuit.id)}
			<li>
				<a href="/circuits/{circuit.id}">{circuit.title}</a>
				<span class="meta">
					updated {new Date(circuit.updatedAt).toLocaleDateString()}{circuit.forkedFromId
						? ' · forked'
						: ''}
				</span>
			</li>
		{/each}
	</ul>
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

	.cta {
		display: inline-block;
		font-weight: 600;
		padding: 0.625rem 1rem;
		background: var(--accent);
		color: #fff;
		border-radius: 0.375rem;
		text-decoration: none;
		transition: background-color 400ms ease;
	}

	.cta:hover {
		background: var(--accent-hover);
	}

	.empty {
		color: var(--text-muted);
		margin-top: 1.5rem;
	}

	.circuit-list {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
	}

	.circuit-list li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
		transition: border-color 550ms ease;
	}

	.meta {
		color: var(--text-muted);
		font-size: 0.8rem;
	}
</style>

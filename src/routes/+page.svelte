<script lang="ts">
	import { UNIT1_ID, UNIT1_TITLE } from '$lib/content/unit1';
</script>

<a class="cta" href="/units/{UNIT1_ID}">Start Unit 1: {UNIT1_TITLE}</a>

<style>
	.cta {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--accent);
		color: #fff;
		text-decoration: none;
		border-radius: 0.375rem;
		font-weight: 600;
		transition: background-color 400ms ease;
	}

	.cta:hover {
		background: var(--accent-hover);
	}
</style>

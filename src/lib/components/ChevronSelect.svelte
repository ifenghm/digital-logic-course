<script lang="ts">
	import { fly } from 'svelte/transition';

	let {
		id,
		name,
		label,
		options,
		value = $bindable(options[0]?.value ?? '')
	}: {
		id: string;
		name: string;
		label: string;
		options: { value: string; label: string }[];
		value?: string;
	} = $props();

	let open = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();

	const selectedLabel = $derived(options.find((option) => option.value === value)?.label ?? value);

	function toggle() {
		open = !open;
	}

	function select(optionValue: string) {
		value = optionValue;
		open = false;
	}

	$effect(() => {
		if (!open) return;
		function handleOutsideClick(event: MouseEvent) {
			if (event.target instanceof Node && !rootEl?.contains(event.target)) {
				open = false;
			}
		}
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				open = false;
				triggerEl?.focus();
			}
		}
		document.addEventListener('click', handleOutsideClick);
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('click', handleOutsideClick);
			document.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<div class="chevron-select" bind:this={rootEl}>
	<input type="hidden" {name} {value} />
	<button
		type="button"
		{id}
		bind:this={triggerEl}
		class="chevron-select-trigger"
		aria-haspopup="true"
		aria-expanded={open}
		aria-controls="{id}-list"
		aria-label={label}
		onclick={toggle}
	>
		<span>{selectedLabel}</span>
		<svg class="chevron" class:open aria-hidden="true" viewBox="0 0 16 16" width="12" height="12">
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
	{#if open}
		<div id="{id}-list" class="chevron-select-list" transition:fly={{ y: -4, duration: 400 }}>
			{#each options as option (option.value)}
				<button
					type="button"
					class="chevron-select-option"
					class:selected={option.value === value}
					onclick={() => select(option.value)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chevron-select {
		position: relative;
		display: inline-block;
	}

	.chevron-select-trigger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font: inherit;
		padding: 0.375rem 0.75rem;
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border-strong);
		border-radius: 0.375rem;
		cursor: pointer;
		min-width: 3rem;
		justify-content: space-between;
		transition:
			border-color 550ms ease,
			background-color 550ms ease,
			color 550ms ease;
	}

	.chevron-select-trigger:hover {
		border-color: var(--accent);
	}

	.chevron {
		flex-shrink: 0;
		color: var(--text-muted);
		transition:
			transform 400ms ease,
			color 550ms ease;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.chevron-select-list {
		position: absolute;
		z-index: 10;
		top: 100%;
		left: 0;
		margin-top: 0.25rem;
		min-width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.375rem;
		box-shadow: 0 4px 12px var(--shadow);
		overflow: hidden;
		transition:
			background-color 550ms ease,
			border-color 550ms ease;
	}

	.chevron-select-option {
		display: block;
		width: 100%;
		font: inherit;
		text-align: center;
		padding: 0.375rem 0.75rem;
		background: none;
		color: var(--text);
		border: none;
		cursor: pointer;
		transition:
			background-color 300ms ease,
			color 550ms ease;
	}

	.chevron-select-option:hover,
	.chevron-select-option.selected {
		background: var(--accent);
		color: #fff;
	}
</style>

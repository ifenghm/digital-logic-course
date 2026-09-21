<script lang="ts">
	import { evaluateCircuit } from '$lib/circuits/evaluate';
	import {
		GATE_INPUT_COUNT,
		type CircuitGraph,
		type CircuitNode,
		type CircuitWire,
		type GateNode,
		type GateType,
		type InputNode,
		type OutputNode
	} from '$lib/circuits/types';

	let { graph = $bindable(), readOnly = false }: { graph: CircuitGraph; readOnly?: boolean } = $props();

	const CANVAS_WIDTH = 900;
	const CANVAS_HEIGHT = 480;
	const GATE_WIDTH = 72;
	const GATE_HEIGHT = 48;
	const INPUT_WIDTH = 56;
	const INPUT_HEIGHT = 30;
	const OUTPUT_SIZE = 44;
	const NOT_BUBBLE_RADIUS = 5;
	const PORT_RADIUS = 6;
	const PORT_HIT_RADIUS = 16;
	const CLICK_DRAG_THRESHOLD = 4;

	type PaletteKind = GateType | 'input' | 'output';

	const PALETTE_ITEMS: { kind: PaletteKind; label: string }[] = [
		{ kind: 'AND', label: 'AND' },
		{ kind: 'OR', label: 'OR' },
		{ kind: 'NOT', label: 'NOT' },
		{ kind: 'input', label: 'Input' },
		{ kind: 'output', label: 'Output' }
	];

	let svgEl: SVGSVGElement | undefined = $state();
	let placeCounter = 0;

	type ActiveDrag =
		| { kind: 'move-node'; nodeId: string; offsetX: number; offsetY: number; startX: number; startY: number; moved: boolean }
		| { kind: 'new-wire'; fromNodeId: string; toPoint: { x: number; y: number } }
		| { kind: 'palette'; paletteKind: PaletteKind; clientPoint: { x: number; y: number }; overCanvas: boolean };

	let activeDrag = $state<ActiveDrag | null>(null);

	const evalResult = $derived(evaluateCircuit(graph));
	const hasLoop = $derived(evalResult.cycleNodeIds.size > 0);

	function nodeSize(node: CircuitNode): { w: number; h: number } {
		if (node.kind === 'gate') return { w: GATE_WIDTH, h: GATE_HEIGHT };
		if (node.kind === 'input') return { w: INPUT_WIDTH, h: INPUT_HEIGHT };
		return { w: OUTPUT_SIZE, h: OUTPUT_SIZE };
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function outputPortPosition(node: GateNode | InputNode): { x: number; y: number } {
		const { w, h } = nodeSize(node);
		return { x: node.x + w, y: node.y + h / 2 };
	}

	function gateInputPortPosition(node: GateNode, port: number): { x: number; y: number } {
		const { h } = nodeSize(node);
		const count = GATE_INPUT_COUNT[node.gateType];
		const spacing = h / (count + 1);
		return { x: node.x, y: node.y + spacing * (port + 1) };
	}

	function outputNodePortPosition(node: OutputNode): { x: number; y: number } {
		const { h } = nodeSize(node);
		return { x: node.x, y: node.y + h / 2 };
	}

	// Signal on a gate's numbered input port: the resolved value of whatever
	// drives it, or null if that port is unwired (or its driver is itself
	// unresolved). Used only for the port's on/off dot, not evaluation.
	function gateInputSignal(nodeId: string, port: number): boolean | null {
		const wire = graph.wires.find((w) => w.toNodeId === nodeId && w.toPort === port);
		return wire ? (evalResult.values.get(wire.fromNodeId) ?? null) : null;
	}

	function paletteKindSize(kind: PaletteKind): { w: number; h: number } {
		if (kind === 'input') return { w: INPUT_WIDTH, h: INPUT_HEIGHT };
		if (kind === 'output') return { w: OUTPUT_SIZE, h: OUTPUT_SIZE };
		return { w: GATE_WIDTH, h: GATE_HEIGHT };
	}

	function wirePathD(from: { x: number; y: number }, to: { x: number; y: number }): string {
		const dx = Math.max(Math.abs(to.x - from.x) / 2, 30);
		return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y} ${to.x - dx} ${to.y} ${to.x} ${to.y}`;
	}

	function gateBodyPath(gateType: GateType, w: number, h: number, bubbleRadius: number = NOT_BUBBLE_RADIUS): string {
		if (gateType === 'AND') {
			const r = h / 2;
			return `M 0 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H 0 Z`;
		}
		if (gateType === 'OR') {
			return `M 0 0 Q ${w * 0.4} 0 ${w * 0.6} ${h * 0.18} Q ${w} ${h * 0.4} ${w} ${h / 2} Q ${w} ${h * 0.6} ${w * 0.6} ${h * 0.82} Q ${w * 0.4} ${h} 0 ${h} Q ${w * 0.1} ${h / 2} 0 0 Z`;
		}
		return `M 0 0 L 0 ${h} L ${w - bubbleRadius * 2} ${h / 2} Z`;
	}

	// Small line-art version of each part, shared by the palette buttons and
	// the drag ghost that follows the pointer while placing one.
	function paletteIconSize(kind: PaletteKind): { w: number; h: number } {
		if (kind === 'input') return { w: 30, h: 16 };
		if (kind === 'output') return { w: 12, h: 12 };
		if (kind === 'OR') return { w: 32, h: 26 };
		return { w: 32, h: 22 };
	}

	function svgPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
		if (!svgEl) return { x: clientX, y: clientY };
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return { x: clientX, y: clientY };
		const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
		return { x: p.x, y: p.y };
	}

	function isOverCanvas(clientX: number, clientY: number): boolean {
		if (!svgEl) return false;
		const rect = svgEl.getBoundingClientRect();
		return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
	}

	function findNearestInputPort(clientX: number, clientY: number): { nodeId: string; port: number } | null {
		const p = svgPointFromClient(clientX, clientY);
		let best: { nodeId: string; port: number; dist: number } | null = null;

		for (const node of graph.nodes) {
			if (node.kind === 'gate') {
				const count = GATE_INPUT_COUNT[node.gateType];
				for (let port = 0; port < count; port++) {
					const pos = gateInputPortPosition(node, port);
					const dist = Math.hypot(pos.x - p.x, pos.y - p.y);
					if (dist <= PORT_HIT_RADIUS && (!best || dist < best.dist)) best = { nodeId: node.id, port, dist };
				}
			} else if (node.kind === 'output') {
				const pos = outputNodePortPosition(node);
				const dist = Math.hypot(pos.x - p.x, pos.y - p.y);
				if (dist <= PORT_HIT_RADIUS && (!best || dist < best.dist)) best = { nodeId: node.id, port: 0, dist };
			}
		}

		return best ? { nodeId: best.nodeId, port: best.port } : null;
	}

	function nextDefaultPosition(): { x: number; y: number } {
		const offset = (placeCounter++ % 6) * 24;
		return { x: 40 + offset, y: 40 + offset };
	}

	function addNode(kind: PaletteKind, x: number, y: number) {
		const id = crypto.randomUUID();
		if (kind === 'input') {
			graph.nodes.push({ id, kind: 'input', x, y, value: false });
		} else if (kind === 'output') {
			graph.nodes.push({ id, kind: 'output', x, y });
		} else {
			graph.nodes.push({ id, kind: 'gate', gateType: kind, x, y });
		}
	}

	function removeNode(id: string) {
		graph.nodes = graph.nodes.filter((n) => n.id !== id);
		graph.wires = graph.wires.filter((w) => w.fromNodeId !== id && w.toNodeId !== id);
	}

	function removeWire(id: string) {
		graph.wires = graph.wires.filter((w) => w.id !== id);
	}

	function connectWire(fromNodeId: string, toNodeId: string, toPort: number) {
		graph.wires = graph.wires.filter((w) => !(w.toNodeId === toNodeId && w.toPort === toPort));
		graph.wires.push({ id: crypto.randomUUID(), fromNodeId, toNodeId, toPort });
	}

	function onWindowPointerMove(event: PointerEvent) {
		const drag = activeDrag;
		if (!drag) return;

		if (drag.kind === 'move-node') {
			const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
			if (dist > CLICK_DRAG_THRESHOLD) drag.moved = true;
			const node = graph.nodes.find((n) => n.id === drag.nodeId);
			if (node && drag.moved) {
				const p = svgPointFromClient(event.clientX, event.clientY);
				const { w, h } = nodeSize(node);
				node.x = clamp(p.x - drag.offsetX, 0, CANVAS_WIDTH - w);
				node.y = clamp(p.y - drag.offsetY, 0, CANVAS_HEIGHT - h);
			}
		} else if (drag.kind === 'new-wire') {
			drag.toPoint = svgPointFromClient(event.clientX, event.clientY);
		} else if (drag.kind === 'palette') {
			drag.clientPoint = { x: event.clientX, y: event.clientY };
			drag.overCanvas = isOverCanvas(event.clientX, event.clientY);
		}
	}

	function onWindowPointerUp(event: PointerEvent) {
		window.removeEventListener('pointermove', onWindowPointerMove);
		const drag = activeDrag;
		activeDrag = null;
		if (!drag) return;

		if (drag.kind === 'move-node') {
			if (!drag.moved) {
				const node = graph.nodes.find((n) => n.id === drag.nodeId);
				if (node?.kind === 'input') node.value = !node.value;
			}
		} else if (drag.kind === 'new-wire') {
			const target = findNearestInputPort(event.clientX, event.clientY);
			if (target) connectWire(drag.fromNodeId, target.nodeId, target.port);
		} else if (drag.kind === 'palette' && drag.overCanvas) {
			const p = svgPointFromClient(event.clientX, event.clientY);
			const { w, h } = paletteKindSize(drag.paletteKind);
			addNode(drag.paletteKind, clamp(p.x - w / 2, 0, CANVAS_WIDTH - w), clamp(p.y - h / 2, 0, CANVAS_HEIGHT - h));
		}
	}

	function beginWindowDrag() {
		window.addEventListener('pointermove', onWindowPointerMove);
		window.addEventListener('pointerup', onWindowPointerUp, { once: true });
	}

	function onNodePointerDown(node: CircuitNode, event: PointerEvent) {
		if (readOnly || event.button !== 0) return;
		event.stopPropagation();
		// Prevent the pointerdown from focusing the node, so dragging it with
		// the mouse doesn't trigger the same blue focus-visible outline that
		// real keyboard (Tab) focus should show. Native <button>s (e.g. the
		// palette) already skip this on mouse interaction; plain SVG <g>
		// elements don't, so we suppress it explicitly here.
		event.preventDefault();
		const start = svgPointFromClient(event.clientX, event.clientY);
		activeDrag = {
			kind: 'move-node',
			nodeId: node.id,
			offsetX: start.x - node.x,
			offsetY: start.y - node.y,
			startX: event.clientX,
			startY: event.clientY,
			moved: false
		};
		beginWindowDrag();
	}

	function onOutputPortPointerDown(node: GateNode | InputNode, event: PointerEvent) {
		if (readOnly || event.button !== 0) return;
		event.stopPropagation();
		activeDrag = { kind: 'new-wire', fromNodeId: node.id, toPoint: outputPortPosition(node) };
		beginWindowDrag();
	}

	function onPalettePointerDown(kind: PaletteKind, event: PointerEvent) {
		if (readOnly || event.button !== 0) return;
		activeDrag = { kind: 'palette', paletteKind: kind, clientPoint: { x: event.clientX, y: event.clientY }, overCanvas: false };
		beginWindowDrag();
	}

	function onPaletteClick(kind: PaletteKind) {
		if (readOnly) return;
		const p = nextDefaultPosition();
		addNode(kind, p.x, p.y);
	}

	function onNodeKeydown(node: CircuitNode, event: KeyboardEvent) {
		if (readOnly) return;
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			removeNode(node.id);
		} else if ((event.key === 'Enter' || event.key === ' ') && node.kind === 'input') {
			event.preventDefault();
			node.value = !node.value;
		} else if (event.key.startsWith('Arrow')) {
			event.preventDefault();
			const step = event.shiftKey ? 20 : 6;
			const { w, h } = nodeSize(node);
			if (event.key === 'ArrowLeft') node.x = clamp(node.x - step, 0, CANVAS_WIDTH - w);
			if (event.key === 'ArrowRight') node.x = clamp(node.x + step, 0, CANVAS_WIDTH - w);
			if (event.key === 'ArrowUp') node.y = clamp(node.y - step, 0, CANVAS_HEIGHT - h);
			if (event.key === 'ArrowDown') node.y = clamp(node.y + step, 0, CANVAS_HEIGHT - h);
		}
	}

	function onWireKeydown(wire: CircuitWire, event: KeyboardEvent) {
		if (readOnly) return;
		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			removeWire(wire.id);
		}
	}

	function nodeLabel(node: CircuitNode): string {
		if (node.kind === 'gate') return `${node.gateType} gate`;
		if (node.kind === 'input') return `Input switch, currently ${node.value ? 'on' : 'off'}`;
		return `Output light, currently ${evalResult.outputValues.get(node.id) ? 'lit' : 'off'}`;
	}
</script>

{#snippet paletteIcon(kind: PaletteKind, w: number, h: number)}
	{#if kind === 'AND' || kind === 'OR' || kind === 'NOT'}
		{@const bubbleRadius = Math.min(4, h / 5)}
		<path d={gateBodyPath(kind, w, h, bubbleRadius)} class="palette-icon-shape" />
		{#if kind === 'NOT'}
			<circle cx={w - bubbleRadius} cy={h / 2} r={bubbleRadius} class="palette-icon-shape" />
		{/if}
	{:else if kind === 'input'}
		<rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx={(h - 3) / 2} class="palette-icon-shape" />
		<circle cx={(h - 3) / 2 + 1.5} cy={h / 2} r={(h - 3) / 2 - 2.5} class="palette-icon-shape" />
	{:else}
		<circle cx={w / 2} cy={h / 2} r={w / 2 - 3} class="palette-icon-shape" />
	{/if}
{/snippet}

<div class="circuit-canvas" class:read-only={readOnly}>
	{#if !readOnly}
		<div class="palette" role="toolbar" aria-label="Circuit parts — drag onto the canvas, or click to add">
			{#each PALETTE_ITEMS as item (item.kind)}
				{@const iconSize = paletteIconSize(item.kind)}
				<button
					type="button"
					class="palette-item"
					class:dragging={activeDrag?.kind === 'palette' && activeDrag.paletteKind === item.kind}
					onpointerdown={(e) => onPalettePointerDown(item.kind, e)}
					onclick={() => onPaletteClick(item.kind)}
				>
					<svg class="palette-icon" viewBox="0 0 {iconSize.w} {iconSize.h}" aria-hidden="true">
						{@render paletteIcon(item.kind, iconSize.w, iconSize.h)}
					</svg>
					<span class="palette-label">{item.label}</span>
				</button>
			{/each}
		</div>
		<p class="instructions">
			Drag a part onto the canvas (or click it to drop one in). Drag from a filled circle to an
			empty circle to wire two parts together. Click an input switch to toggle it. Select a part
			or wire and press Delete to remove it.
		</p>
	{/if}

	<svg bind:this={svgEl} class="canvas" viewBox="0 0 {CANVAS_WIDTH} {CANVAS_HEIGHT}" role="img" aria-label="Circuit diagram">
		<rect class="canvas-bg" x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

		<g class="wires">
			{#each graph.wires as wire (wire.id)}
				{@const fromNode = graph.nodes.find((n) => n.id === wire.fromNodeId)}
				{@const toNode = graph.nodes.find((n) => n.id === wire.toNodeId)}
				{#if fromNode && fromNode.kind !== 'output' && toNode}
					{@const from = outputPortPosition(fromNode)}
					{@const to = toNode.kind === 'output' ? outputNodePortPosition(toNode) : gateInputPortPosition(toNode /* never 'input': inputs have no input ports to wire into */ as GateNode, wire.toPort)}
					<path
						d={wirePathD(from, to)}
						class="wire"
						class:on={evalResult.values.get(wire.fromNodeId) === true}
						tabindex={readOnly ? -1 : 0}
						role={readOnly ? undefined : 'button'}
						aria-label={readOnly ? undefined : 'Wire — press Delete to remove'}
						onpointerdown={(e) => {
							if (readOnly) return;
							e.stopPropagation();
							removeWire(wire.id);
						}}
						onkeydown={(e) => onWireKeydown(wire, e)}
					/>
				{/if}
			{/each}
			{#if activeDrag?.kind === 'new-wire'}
				{@const fromNode = graph.nodes.find((n) => n.id === activeDrag.fromNodeId)}
				{#if fromNode && fromNode.kind !== 'output'}
					<path d={wirePathD(outputPortPosition(fromNode), activeDrag.toPoint)} class="wire pending" />
				{/if}
			{/if}
		</g>

		<g class="nodes">
			{#each graph.nodes as node (node.id)}
				{@const size = nodeSize(node)}
				<g
					class="node"
					class:loop={evalResult.cycleNodeIds.has(node.id)}
					class:pressed={activeDrag?.kind === 'move-node' && activeDrag.nodeId === node.id}
					transform="translate({node.x},{node.y})"
					tabindex={readOnly ? -1 : 0}
					role={readOnly ? undefined : 'button'}
					aria-label={readOnly ? undefined : nodeLabel(node)}
					onpointerdown={(e) => onNodePointerDown(node, e)}
					onkeydown={(e) => onNodeKeydown(node, e)}
				>
					{#if node.kind === 'gate'}
						<path d={gateBodyPath(node.gateType, size.w, size.h)} class="gate-body" class:active={evalResult.values.get(node.id) === true} />
						{#if node.gateType === 'NOT'}
							<circle cx={size.w - NOT_BUBBLE_RADIUS} cy={size.h / 2} r={NOT_BUBBLE_RADIUS} class="not-bubble" class:active={evalResult.values.get(node.id) === true} />
						{/if}
						<text x={size.w * 0.32} y={size.h / 2} class="gate-label" text-anchor="middle" dominant-baseline="central">
							{node.gateType}
						</text>
						{#each Array.from({ length: GATE_INPUT_COUNT[node.gateType] }) as _, port (port)}
							{@const pos = gateInputPortPosition(node, port)}
							<circle
								cx={pos.x - node.x}
								cy={pos.y - node.y}
								r={PORT_RADIUS}
								class="port input-port"
								class:filled={gateInputSignal(node.id, port) === true}
							/>
						{/each}
						<circle
							cx={size.w}
							cy={size.h / 2}
							r={PORT_RADIUS}
							class="port output-port"
							class:filled={evalResult.values.get(node.id) === true}
							onpointerdown={(e) => onOutputPortPointerDown(node, e)}
						/>
					{:else if node.kind === 'input'}
						<rect width={size.w} height={size.h} rx={size.h / 2} class="input-track" class:on={node.value} />
						<circle cx={node.value ? size.w - size.h / 2 : size.h / 2} cy={size.h / 2} r={size.h / 2 - 3} class="input-knob" />
						<circle cx={size.w} cy={size.h / 2} r={PORT_RADIUS} class="port output-port" class:filled={node.value} onpointerdown={(e) => onOutputPortPointerDown(node, e)} />
					{:else}
						{@const lit = evalResult.outputValues.get(node.id)}
						<circle cx={size.w / 2} cy={size.w / 2} r={size.w / 2 - 3} class="bulb" class:lit={lit === true} />
						<circle cx={0} cy={size.h / 2} r={PORT_RADIUS} class="port input-port" class:filled={lit !== null && lit !== undefined} />
					{/if}

					{#if !readOnly}
						<circle
							cx={size.w + 8}
							cy={-8}
							r="9"
							class="delete-btn"
							role="button"
							tabindex="-1"
							aria-label="Delete this part"
							onpointerdown={(e) => {
								e.stopPropagation();
								removeNode(node.id);
							}}
						/>
						<text x={size.w + 8} y={-8} class="delete-btn-label" text-anchor="middle" dominant-baseline="central">×</text>
					{/if}
				</g>
			{/each}
		</g>
	</svg>

	{#if hasLoop}
		<p class="warning" role="alert">
			This circuit has a loop — a gate's output feeds back into its own input, so it can't settle
			on a value. Break the loop to see a result.
		</p>
	{/if}

	{#if activeDrag?.kind === 'palette'}
		{@const s = paletteIconSize(activeDrag.paletteKind)}
		<div
			class="drag-ghost"
			class:over-canvas={activeDrag.overCanvas}
			style="left: {activeDrag.clientPoint.x}px; top: {activeDrag.clientPoint.y}px;"
		>
			<svg viewBox="0 0 {s.w} {s.h}" width={s.w * 1.8} height={s.h * 1.8} aria-hidden="true">
				{@render paletteIcon(activeDrag.paletteKind, s.w, s.h)}
			</svg>
		</div>
	{/if}
</div>

<style>
	.circuit-canvas {
		--wire-off: var(--border-strong);
		--wire-on: var(--accent);
		--gate-fill: var(--surface);
		--gate-fill-active: var(--accent);
		--bulb-off: var(--surface);
		--bulb-on: #f5c518;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.palette {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.palette-item {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		font: inherit;
		font-weight: 400;
		padding: 0.5rem 0.75rem;
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--border-strong);
		border-radius: 0.375rem;
		cursor: grab;
		touch-action: none;
		transition:
			background-color 400ms ease,
			border-color 550ms ease,
			color 200ms ease;
	}

	.palette-label {
		white-space: nowrap;
	}

	.palette-item:hover {
		border-color: var(--accent);
	}

	.palette-item.dragging {
		border-color: var(--accent);
		color: var(--accent);
	}

	.palette-icon {
		flex-shrink: 0;
		overflow: visible;
	}

	.palette-icon-shape {
		fill: none;
		stroke: currentColor;
		transition:
			stroke 150ms ease,
			stroke-width 150ms ease;
	}

	.palette-item.dragging .palette-icon-shape {
		stroke: var(--accent);
		stroke-width: 2;
	}

	.instructions {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
		max-width: 40rem;
	}

	.canvas {
		width: 100%;
		height: auto;
		aspect-ratio: 900 / 480;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		background: var(--bg);
		transition: border-color 550ms ease;
		touch-action: none;
	}

	.canvas-bg {
		fill: var(--bg);
	}

	.wire {
		fill: none;
		stroke: var(--wire-off);
		stroke-width: 3;
		cursor: pointer;
		transition: stroke 200ms ease;
	}

	.wire:hover,
	.wire:focus-visible {
		stroke: var(--error);
		outline: none;
	}

	.wire.on {
		stroke: var(--wire-on);
	}

	.wire.pending {
		stroke: var(--text-muted);
		stroke-dasharray: 6 4;
	}

	.node {
		cursor: grab;
		touch-action: none;
	}

	.node:focus-visible .gate-body,
	.node:focus-visible .input-track,
	.node:focus-visible .bulb {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.node.pressed .gate-body,
	.node.pressed .not-bubble,
	.node.pressed .input-track,
	.node.pressed .bulb {
		stroke: var(--accent);
		stroke-width: 3;
	}

	.node.loop .gate-body {
		stroke: var(--error);
	}

	.gate-body {
		fill: var(--gate-fill);
		stroke: var(--border-strong);
		stroke-width: 2;
		transition:
			fill 200ms ease,
			stroke-color 550ms ease;
	}

	.gate-body.active {
		fill: var(--gate-fill-active);
	}

	.not-bubble {
		fill: var(--gate-fill);
		stroke: var(--border-strong);
		stroke-width: 2;
	}

	.not-bubble.active {
		fill: var(--gate-fill-active);
	}

	.gate-label {
		font-size: 0.7rem;
		font-weight: 700;
		fill: var(--text);
		pointer-events: none;
		user-select: none;
	}

	.gate-body.active ~ .gate-label {
		fill: #fff;
	}

	.port {
		fill: var(--surface);
		stroke: var(--border-strong);
		stroke-width: 2;
	}

	.port.filled {
		fill: var(--wire-on);
		stroke: var(--wire-on);
	}

	.output-port {
		cursor: crosshair;
	}

	.input-track {
		fill: var(--wire-off);
		transition: fill 200ms ease;
	}

	.input-track.on {
		fill: var(--wire-on);
	}

	.input-knob {
		fill: #fff;
		stroke: var(--border-strong);
		stroke-width: 1;
		pointer-events: none;
		transition: cx 200ms ease;
	}

	.bulb {
		fill: var(--bulb-off);
		stroke: var(--border-strong);
		stroke-width: 2;
		transition: fill 200ms ease;
	}

	.bulb.lit {
		fill: var(--bulb-on);
		stroke: #b8860b;
	}

	.delete-btn {
		fill: var(--error);
		opacity: 0;
		cursor: pointer;
		transition: opacity 150ms ease;
	}

	.delete-btn-label {
		font-size: 0.7rem;
		fill: #fff;
		opacity: 0;
		pointer-events: none;
		transition: opacity 150ms ease;
		user-select: none;
	}

	.node:hover .delete-btn,
	.node:hover .delete-btn-label,
	.node:focus-within .delete-btn,
	.node:focus-within .delete-btn-label {
		opacity: 1;
	}

	.drag-ghost {
		position: fixed;
		left: 0;
		top: 0;
		transform: translate(-50%, -50%);
		pointer-events: none;
		z-index: 1000;
		opacity: 0.75;
		transition: opacity 150ms ease;
	}

	.drag-ghost.over-canvas {
		opacity: 1;
	}

	.drag-ghost svg {
		overflow: visible;
	}

	.drag-ghost .palette-icon-shape {
		stroke: var(--accent);
		stroke-width: 3;
		fill: color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.warning {
		margin: 0;
		padding: 0.75rem 1rem;
		background: var(--warn-bg);
		border: 1px solid var(--warn-border);
		color: var(--warn-text);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		transition:
			background-color 550ms ease,
			border-color 550ms ease,
			color 550ms ease;
	}
</style>

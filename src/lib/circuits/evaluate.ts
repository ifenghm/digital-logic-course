import { GATE_INPUT_COUNT, type CircuitGraph } from './types';

export interface EvaluationResult {
	// Output value of every gate and input node (not output nodes — see
	// outputValues). Absent/null means the value could not be resolved: an
	// unwired gate input, or a node that sits on a feedback loop.
	values: Map<string, boolean>;
	// Lit state of every output node: true/false once resolved, or null if
	// it is unwired or its driving value could not be resolved.
	outputValues: Map<string, boolean | null>;
	// Node ids that sit on a feedback loop (a gate whose output, directly or
	// indirectly, feeds back into one of its own inputs). This editor only
	// targets combinational circuits, so a non-empty set means "this won't
	// settle" and the UI should warn rather than silently show 0/off.
	cycleNodeIds: Set<string>;
}

const IN_PROGRESS = Symbol('in-progress');

export function evaluateCircuit(graph: CircuitGraph): EvaluationResult {
	const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
	const incomingByTarget = new Map<string, typeof graph.wires>();
	for (const wire of graph.wires) {
		const list = incomingByTarget.get(wire.toNodeId) ?? [];
		list.push(wire);
		incomingByTarget.set(wire.toNodeId, list);
	}

	const values = new Map<string, boolean>();
	const cycleNodeIds = new Set<string>();
	const state = new Map<string, boolean | typeof IN_PROGRESS>();

	function valueOf(nodeId: string): boolean | null {
		const node = nodesById.get(nodeId);
		if (!node || node.kind === 'output') return null;

		const cached = state.get(nodeId);
		if (cached === IN_PROGRESS) {
			cycleNodeIds.add(nodeId);
			return null;
		}
		if (typeof cached === 'boolean') return cached;

		if (node.kind === 'input') {
			state.set(nodeId, node.value);
			values.set(nodeId, node.value);
			return node.value;
		}

		state.set(nodeId, IN_PROGRESS);
		const inputCount = GATE_INPUT_COUNT[node.gateType];
		const incoming = incomingByTarget.get(nodeId) ?? [];
		const portValues: (boolean | null)[] = [];
		for (let port = 0; port < inputCount; port++) {
			const wire = incoming.find((w) => w.toPort === port);
			portValues.push(wire ? valueOf(wire.fromNodeId) : null);
		}

		let result: boolean | null;
		if (portValues.some((v) => v === null)) {
			result = null;
		} else if (node.gateType === 'AND') {
			result = portValues.every(Boolean);
		} else if (node.gateType === 'OR') {
			result = portValues.some(Boolean);
		} else {
			result = !portValues[0];
		}

		if (result === null) {
			// Not resolvable (yet) — leave unmemoized so a later reference
			// (e.g. once its driver up the graph resolves) recomputes it.
			state.delete(nodeId);
		} else {
			state.set(nodeId, result);
			values.set(nodeId, result);
		}
		return result;
	}

	for (const node of graph.nodes) {
		if (node.kind === 'gate' || node.kind === 'input') valueOf(node.id);
	}

	const outputValues = new Map<string, boolean | null>();
	for (const node of graph.nodes) {
		if (node.kind !== 'output') continue;
		const wire = (incomingByTarget.get(node.id) ?? [])[0];
		outputValues.set(node.id, wire ? valueOf(wire.fromNodeId) : null);
	}

	return { values, outputValues, cycleNodeIds };
}

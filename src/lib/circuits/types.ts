// The shape of a saved circuit: a graph of gates/inputs/an output, wired
// together. This is what gets JSON-encoded into Circuit.graph (see
// src/lib/server/circuits.ts) and what the editor UI (CircuitCanvas.svelte)
// reads and mutates directly.

export type GateType = 'AND' | 'OR' | 'NOT';

export const GATE_INPUT_COUNT: Record<GateType, number> = {
	AND: 2,
	OR: 2,
	NOT: 1
};

interface NodeBase {
	id: string;
	// Top-left corner of the node's bounding box, in canvas units.
	x: number;
	y: number;
}

export interface GateNode extends NodeBase {
	kind: 'gate';
	gateType: GateType;
}

export interface InputNode extends NodeBase {
	kind: 'input';
	value: boolean;
}

export interface OutputNode extends NodeBase {
	kind: 'output';
}

export type CircuitNode = GateNode | InputNode | OutputNode;

// Connects one node's single output port to another node's numbered input
// port (0 for a NOT gate or the output bulb; 0 or 1 for AND/OR — see
// GATE_INPUT_COUNT). A node's output port can drive more than one wire
// (fan-out); an input port is driven by at most one wire, enforced by the
// editor (a new wire to an occupied port replaces the old one), not here.
export interface CircuitWire {
	id: string;
	fromNodeId: string;
	toNodeId: string;
	toPort: number;
}

export interface CircuitGraph {
	nodes: CircuitNode[];
	wires: CircuitWire[];
}

export function emptyGraph(): CircuitGraph {
	return { nodes: [], wires: [] };
}

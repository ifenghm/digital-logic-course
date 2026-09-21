import { describe, expect, it } from 'vitest';
import { evaluateCircuit } from './evaluate';
import type { CircuitGraph } from './types';

function input(id: string, value: boolean, x = 0, y = 0) {
	return { id, kind: 'input' as const, x, y, value };
}

function gate(id: string, gateType: 'AND' | 'OR' | 'NOT', x = 0, y = 0) {
	return { id, kind: 'gate' as const, gateType, x, y };
}

function output(id: string, x = 0, y = 0) {
	return { id, kind: 'output' as const, x, y };
}

function wire(id: string, fromNodeId: string, toNodeId: string, toPort = 0) {
	return { id, fromNodeId, toNodeId, toPort };
}

describe('evaluateCircuit: gate truth tables', () => {
	const cases: { gateType: 'AND' | 'OR' | 'NOT'; a: boolean; b?: boolean; expected: boolean }[] = [
		{ gateType: 'AND', a: false, b: false, expected: false },
		{ gateType: 'AND', a: true, b: false, expected: false },
		{ gateType: 'AND', a: true, b: true, expected: true },
		{ gateType: 'OR', a: false, b: false, expected: false },
		{ gateType: 'OR', a: true, b: false, expected: true },
		{ gateType: 'OR', a: true, b: true, expected: true },
		{ gateType: 'NOT', a: false, expected: true },
		{ gateType: 'NOT', a: true, expected: false }
	];

	for (const { gateType, a, b, expected } of cases) {
		it(`${gateType}(${a}${b !== undefined ? `, ${b}` : ''}) = ${expected}`, () => {
			const graph: CircuitGraph = {
				nodes: [
					input('a', a),
					...(b !== undefined ? [input('b', b)] : []),
					gate('g', gateType),
					output('out')
				],
				wires: [
					wire('w1', 'a', 'g', 0),
					...(b !== undefined ? [wire('w2', 'b', 'g', 1)] : []),
					wire('w3', 'g', 'out')
				]
			};

			const result = evaluateCircuit(graph);
			expect(result.values.get('g')).toBe(expected);
			expect(result.outputValues.get('out')).toBe(expected);
		});
	}
});

describe('evaluateCircuit: unwired and fan-out', () => {
	it('leaves a gate with an unwired input unresolved', () => {
		const graph: CircuitGraph = {
			nodes: [input('a', true), gate('g', 'AND'), output('out')],
			wires: [wire('w1', 'a', 'g', 0), wire('w2', 'g', 'out')]
		};

		const result = evaluateCircuit(graph);
		expect(result.values.get('g')).toBeUndefined();
		expect(result.outputValues.get('out')).toBeNull();
	});

	it('leaves an unwired output null', () => {
		const graph: CircuitGraph = {
			nodes: [output('out')],
			wires: []
		};

		expect(evaluateCircuit(graph).outputValues.get('out')).toBeNull();
	});

	it('lets one input drive two gates (fan-out)', () => {
		const graph: CircuitGraph = {
			nodes: [input('a', true), gate('g1', 'NOT'), gate('g2', 'NOT'), output('out1'), output('out2')],
			wires: [
				wire('w1', 'a', 'g1', 0),
				wire('w2', 'a', 'g2', 0),
				wire('w3', 'g1', 'out1'),
				wire('w4', 'g2', 'out2')
			]
		};

		const result = evaluateCircuit(graph);
		expect(result.outputValues.get('out1')).toBe(false);
		expect(result.outputValues.get('out2')).toBe(false);
	});

	it('a later wire to the same input port overrides the earlier one at evaluation time (last wire wins)', () => {
		// The editor is expected to keep at most one wire per input port, but
		// evaluation should still be well-defined if that invariant is ever
		// violated — it takes the last-declared wire for a given port.
		const graph: CircuitGraph = {
			nodes: [input('a', true), input('b', false), gate('g', 'NOT'), output('out')],
			wires: [wire('w1', 'a', 'g', 0), wire('w2', 'b', 'g', 0), wire('w3', 'g', 'out')]
		};

		expect(evaluateCircuit(graph).outputValues.get('out')).toBe(true);
	});
});

describe('evaluateCircuit: feedback loops', () => {
	it('detects a gate that feeds back into its own input and does not hang', () => {
		const graph: CircuitGraph = {
			nodes: [gate('g', 'NOT'), output('out')],
			wires: [wire('w1', 'g', 'g', 0), wire('w2', 'g', 'out')]
		};

		const result = evaluateCircuit(graph);
		expect(result.cycleNodeIds.size).toBeGreaterThan(0);
		expect(result.outputValues.get('out')).toBeNull();
	});

	it('detects a longer loop across two gates', () => {
		const graph: CircuitGraph = {
			nodes: [gate('g1', 'NOT'), gate('g2', 'NOT')],
			wires: [wire('w1', 'g1', 'g2', 0), wire('w2', 'g2', 'g1', 0)]
		};

		expect(evaluateCircuit(graph).cycleNodeIds.size).toBeGreaterThan(0);
	});
});

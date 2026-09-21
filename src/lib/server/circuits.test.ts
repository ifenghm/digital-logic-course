import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { emptyGraph, type CircuitGraph } from '$lib/circuits/types';
import { prisma } from './db';
import {
	createCircuit,
	deleteCircuit,
	forkCircuit,
	getCircuit,
	listCircuitsForOwner,
	parseGraph,
	serializeGraph,
	updateCircuit
} from './circuits';

async function createTestUser(): Promise<string> {
	const user = await prisma.user.create({ data: { id: `user-${randomUUID()}`, displayName: 'Test User' } });
	return user.id;
}

const SAMPLE_GRAPH: CircuitGraph = {
	nodes: [
		{ id: 'in1', kind: 'input', x: 0, y: 0, value: true },
		{ id: 'out1', kind: 'output', x: 200, y: 0 }
	],
	wires: [{ id: 'w1', fromNodeId: 'in1', toNodeId: 'out1', toPort: 0 }]
};

describe('parseGraph / serializeGraph (pure)', () => {
	it('falls back to an empty graph for corrupt or missing JSON', () => {
		expect(parseGraph('not json')).toEqual(emptyGraph());
		expect(parseGraph('')).toEqual(emptyGraph());
		expect(parseGraph('{"nodes": "nope", "wires": []}')).toEqual(emptyGraph());
	});

	it('round-trips a graph through serialize/parse', () => {
		expect(parseGraph(serializeGraph(SAMPLE_GRAPH))).toEqual(SAMPLE_GRAPH);
	});
});

describe('circuit persistence (DB)', () => {
	afterAll(async () => {
		await prisma.$disconnect();
	});

	it('creates and fetches a circuit', async () => {
		const ownerId = await createTestUser();
		const created = await createCircuit(ownerId, 'My Circuit', SAMPLE_GRAPH);

		const fetched = await getCircuit(created.id);
		expect(fetched?.title).toBe('My Circuit');
		expect(parseGraph(fetched?.graph ?? '')).toEqual(SAMPLE_GRAPH);
		expect(fetched?.forkedFromId).toBeNull();
	});

	it('updates the title and graph of an existing circuit', async () => {
		const ownerId = await createTestUser();
		const created = await createCircuit(ownerId, 'Original', emptyGraph());

		const updated = await updateCircuit(created.id, 'Renamed', SAMPLE_GRAPH);
		expect(updated.title).toBe('Renamed');
		expect(parseGraph(updated.graph)).toEqual(SAMPLE_GRAPH);
	});

	it('deletes a circuit', async () => {
		const ownerId = await createTestUser();
		const created = await createCircuit(ownerId, 'Doomed', emptyGraph());

		await deleteCircuit(created.id);
		expect(await getCircuit(created.id)).toBeNull();
	});

	it('lists only circuits owned by the given owner, most recently updated first', async () => {
		const ownerId = await createTestUser();
		const otherOwnerId = await createTestUser();
		await createCircuit(otherOwnerId, 'Not mine', emptyGraph());
		const first = await createCircuit(ownerId, 'First', emptyGraph());
		const second = await createCircuit(ownerId, 'Second', emptyGraph());

		const list = await listCircuitsForOwner(ownerId);
		expect(list.map((c) => c.id)).toEqual([second.id, first.id]);
	});

	it('forking copies the graph and title, and records the source', async () => {
		const ownerId = await createTestUser();
		const forkerId = await createTestUser();
		const source = await createCircuit(ownerId, 'Original', SAMPLE_GRAPH);

		const fork = await forkCircuit(source, forkerId);
		expect(fork.ownerId).toBe(forkerId);
		expect(fork.title).toBe('Copy of Original');
		expect(parseGraph(fork.graph)).toEqual(SAMPLE_GRAPH);
		expect(fork.forkedFromId).toBe(source.id);
	});
});

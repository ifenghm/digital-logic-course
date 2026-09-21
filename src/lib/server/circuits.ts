import type { Circuit } from '@prisma/client';
import { emptyGraph, type CircuitGraph } from '$lib/circuits/types';
import { prisma } from './db';

export function parseGraph(raw: string): CircuitGraph {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && Array.isArray(parsed.nodes) && Array.isArray(parsed.wires)) {
			return parsed as CircuitGraph;
		}
		return emptyGraph();
	} catch {
		return emptyGraph();
	}
}

export function serializeGraph(graph: CircuitGraph): string {
	return JSON.stringify(graph);
}

export async function createCircuit(
	ownerId: string,
	title: string,
	graph: CircuitGraph,
	forkedFromId?: string
): Promise<Circuit> {
	return prisma.circuit.create({
		data: { ownerId, title, graph: serializeGraph(graph), forkedFromId }
	});
}

export async function getCircuit(id: string): Promise<Circuit | null> {
	return prisma.circuit.findUnique({ where: { id } });
}

export async function listCircuitsForOwner(ownerId: string): Promise<Circuit[]> {
	return prisma.circuit.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' } });
}

// Only the owner may update a circuit's title/graph — callers must check
// `circuit.ownerId` against the signed-in user themselves (see
// src/routes/circuits/[id]/+page.server.ts); this function trusts its
// caller and does not re-check ownership.
export async function updateCircuit(id: string, title: string, graph: CircuitGraph): Promise<Circuit> {
	return prisma.circuit.update({
		where: { id },
		data: { title, graph: serializeGraph(graph) }
	});
}

export async function deleteCircuit(id: string): Promise<void> {
	await prisma.circuit.delete({ where: { id } });
}

// Copies a circuit's current graph into a new row owned by `newOwnerId`,
// recording where it came from. The source's own graph/title are untouched.
export async function forkCircuit(source: Circuit, newOwnerId: string): Promise<Circuit> {
	return prisma.circuit.create({
		data: {
			ownerId: newOwnerId,
			title: `Copy of ${source.title}`,
			graph: source.graph,
			forkedFromId: source.id
		}
	});
}

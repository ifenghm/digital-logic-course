import { error, fail, redirect } from '@sveltejs/kit';
import { deleteCircuit, forkCircuit, getCircuit, parseGraph, updateCircuit } from '$lib/server/circuits';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const circuit = await getCircuit(params.id);
	if (!circuit) error(404, 'Circuit not found');

	return {
		id: circuit.id,
		title: circuit.title,
		graph: parseGraph(circuit.graph),
		isOwner: locals.user?.id === circuit.ownerId,
		canFork: Boolean(locals.user)
	};
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		const circuit = await getCircuit(params.id);
		if (!circuit) error(404, 'Circuit not found');
		if (!locals.user || locals.user.id !== circuit.ownerId) {
			return fail(403, { error: 'Only the owner can edit this circuit.' });
		}

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim() || 'Untitled circuit';
		const graph = parseGraph(String(form.get('graph') ?? ''));

		await updateCircuit(circuit.id, title, graph);
		return { saved: true };
	},

	fork: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to make a copy.' });

		const circuit = await getCircuit(params.id);
		if (!circuit) error(404, 'Circuit not found');

		const copy = await forkCircuit(circuit, locals.user.id);
		redirect(303, `/circuits/${copy.id}`);
	},

	delete: async ({ params, locals }) => {
		const circuit = await getCircuit(params.id);
		if (!circuit) error(404, 'Circuit not found');
		if (!locals.user || locals.user.id !== circuit.ownerId) {
			return fail(403, { error: 'Only the owner can delete this circuit.' });
		}

		await deleteCircuit(circuit.id);
		redirect(303, '/circuits');
	}
};

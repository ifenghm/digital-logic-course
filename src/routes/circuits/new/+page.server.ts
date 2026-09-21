import { fail, redirect } from '@sveltejs/kit';
import { createCircuit, parseGraph } from '$lib/server/circuits';
import type { Actions } from './$types';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to save a circuit.' });

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim() || 'Untitled circuit';
		const graph = parseGraph(String(form.get('graph') ?? ''));

		const circuit = await createCircuit(locals.user.id, title, graph);
		redirect(303, `/circuits/${circuit.id}`);
	}
};

import { redirect } from '@sveltejs/kit';
import { listCircuitsForOwner } from '$lib/server/circuits';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const circuits = await listCircuitsForOwner(locals.user.id);
	return { circuits };
};

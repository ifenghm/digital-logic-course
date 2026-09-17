import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	clearSessionCookie(cookies);
	redirect(303, '/');
};

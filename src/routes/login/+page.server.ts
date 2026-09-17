import { fail, redirect } from '@sveltejs/kit';
import { authenticate } from '$lib/server/auth/authenticate';
import { setSessionCookie } from '$lib/server/auth/session';
import { GUEST_SESSION_COOKIE_NAME } from '$lib/server/guestSession';
import { migrateGuestProgressToUser } from '$lib/server/migrateGuestToUser';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const displayName = String(form.get('displayName') ?? '').trim();

		if (!email) {
			return fail(400, { error: 'Email is required.' });
		}

		const { user } = await authenticate('google', { email, displayName });
		setSessionCookie(cookies, user.id);

		const guestSessionId = locals.guestSessionId;
		if (guestSessionId) {
			await migrateGuestProgressToUser(guestSessionId, user.id);
			cookies.delete(GUEST_SESSION_COOKIE_NAME, { path: '/' });
		}

		redirect(303, '/');
	}
};

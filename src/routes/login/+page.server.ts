import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { authenticate } from '$lib/server/auth/authenticate';
import { setSessionCookie } from '$lib/server/auth/session';
import { GUEST_SESSION_COOKIE_NAME } from '$lib/server/guestSession';
import { migrateGuestProgressToUser } from '$lib/server/migrateGuestToUser';
import type { User } from '@prisma/client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return {};
};

// Shared by both actions below, once a provider has already verified who
// the user is: issue a session and migrate any guest progress onto the
// new/returning account. Always redirects on success (never returns), so
// it must not be called from inside a try/catch around verification —
// `redirect()` throws a special value that a generic catch would swallow.
async function completeSignIn(user: User, cookies: Cookies, locals: App.Locals): Promise<never> {
	setSessionCookie(cookies, user.id);

	const guestSessionId = locals.guestSessionId;
	if (guestSessionId) {
		await migrateGuestProgressToUser(guestSessionId, user.id);
		cookies.delete(GUEST_SESSION_COOKIE_NAME, { path: '/' });
	}

	redirect(303, '/');
}

export const actions: Actions = {
	// Real Google Sign-In: the client posts the signed ID token it got back
	// from Google's "Sign In With Google" button (see +page.svelte).
	google: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const idToken = String(form.get('idToken') ?? '');

		if (!idToken) {
			return fail(400, { error: 'Missing Google credential.' });
		}

		let result: Awaited<ReturnType<typeof authenticate>>;
		try {
			result = await authenticate('google', { idToken });
		} catch {
			return fail(400, { error: 'Could not verify that Google sign-in. Please try again.' });
		}

		return completeSignIn(result.user, cookies, locals);
	},

	// Dev-only stub form, used when PUBLIC_GOOGLE_CLIENT_ID isn't configured.
	// Named (not `default`) because SvelteKit forbids mixing a `default`
	// action with named actions (`google`) in the same file.
	stub: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const displayName = String(form.get('displayName') ?? '').trim();

		if (!email) {
			return fail(400, { error: 'Email is required.' });
		}

		const { user } = await authenticate('google', { email, displayName });
		return completeSignIn(user, cookies, locals);
	}
};

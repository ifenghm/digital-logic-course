import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { SESSION_COOKIE_NAME, verifySessionToken } from '$lib/server/auth/session';
import { isRole } from '$lib/server/auth/types';
import { prisma } from '$lib/server/db';
import {
	createGuestSession,
	GUEST_SESSION_COOKIE_NAME,
	getActiveGuestSession,
	touchGuestSession
} from '$lib/server/guestSession';

const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Resolves who's making this request: a signed-in user (via the signed
// `auth_session` cookie) or an anonymous guest (via the server-issued
// `guest_session` cookie — see CLAUDE.md Feature 1c). Every request gets
// exactly one of the two; a guest with no cookie yet gets a new
// `guest_sessions` row created right here, on first visit.
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.guestSessionId = null;

	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);
	const userId = sessionToken ? verifySessionToken(sessionToken) : null;

	let signedIn = false;
	if (userId) {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, displayName: true, role: true }
		});
		if (user && isRole(user.role)) {
			event.locals.user = { id: user.id, displayName: user.displayName, role: user.role };
			signedIn = true;
		} else {
			// Session pointed at a user that no longer exists (or has a corrupt
			// role) — treat as logged out and fall through to the guest path.
			event.cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
		}
	}

	if (!signedIn) {
		const guestCookie = event.cookies.get(GUEST_SESSION_COOKIE_NAME);
		const activeGuestSession = guestCookie ? await getActiveGuestSession(guestCookie) : null;

		if (activeGuestSession) {
			event.locals.guestSessionId = activeGuestSession.id;
			await touchGuestSession(activeGuestSession.id);
		} else {
			const guestSession = await createGuestSession();
			event.locals.guestSessionId = guestSession.id;
			event.cookies.set(GUEST_SESSION_COOKIE_NAME, guestSession.id, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'lax',
				maxAge: GUEST_COOKIE_MAX_AGE
			});
		}
	}

	const response = await resolve(event);
	// Google Identity Services (see /login) signs in through a cross-origin
	// popup to accounts.google.com; once that popup navigates to a page with
	// its own strict Cross-Origin-Opener-Policy, browsers sever the
	// opener/popup relationship unless *our* page explicitly opts back in —
	// otherwise the popup's postMessage back to us is silently dropped
	// ("Cross-Origin-Opener-Policy policy would block the window.postMessage
	// call"). `same-origin-allow-popups` still isolates this origin from
	// unrelated cross-origin windows, it just keeps that one relationship.
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	return response;
};

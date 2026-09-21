import { OAuth2Client } from 'google-auth-library';
import { env } from '$env/dynamic/public';
import type { VerifiedIdentity } from '../types';

// Real Google Sign-In: the browser gets a signed ID token (a JWT) straight
// from Google's "Sign In With Google" JS library (see /login/+page.svelte)
// and hands it to the server, which verifies the signature against Google's
// published JWKS and pulls `sub` / `name` / `email` / `email_verified` out
// of the verified payload. No client secret or redirect round-trip needed
// for this flow — `verifyIdToken` does the signature/audience/expiry checks.
const client = new OAuth2Client();

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedIdentity> {
	const clientId = env.PUBLIC_GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw new Error('PUBLIC_GOOGLE_CLIENT_ID is not configured');
	}

	const ticket = await client.verifyIdToken({ idToken, audience: clientId });
	const payload = ticket.getPayload();
	if (!payload?.sub) {
		throw new Error('Invalid Google credential: missing subject claim');
	}
	if (!payload.email) {
		throw new Error('Google account has no email');
	}

	return {
		provider: 'google',
		providerUserId: payload.sub,
		displayName: payload.name?.trim() || payload.email,
		email: payload.email.trim().toLowerCase(),
		// Read straight from Google's own claim — auto-linking an existing
		// account by email is only safe when Google itself vouches for the
		// address (see CLAUDE.md Authentication).
		emailVerified: payload.email_verified === true
	};
}

// Dev-only fallback, used by the /login stub form when
// PUBLIC_GOOGLE_CLIENT_ID isn't configured (e.g. a fresh clone with no
// Google Cloud credentials set up yet). `credential` is an email + display
// name the developer typed in to simulate "the Google account that signed
// in." Using the email as providerUserId stands in for Google's real `sub`
// claim, and lets a developer simulate "log in as the same account again"
// by reusing the same email.
export interface GoogleStubCredential {
	email: string;
	displayName: string;
}

export function verifyGoogleStubCredential(credential: GoogleStubCredential): VerifiedIdentity {
	const email = credential.email.trim().toLowerCase();
	if (!email) {
		throw new Error('Stub Google credential requires an email');
	}

	return {
		provider: 'google',
		providerUserId: email,
		displayName: credential.displayName.trim() || email,
		email,
		// The stub always reports the email as verified, since there's no
		// real Google account behind it to disagree.
		emailVerified: true
	};
}

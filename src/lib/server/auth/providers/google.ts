import type { VerifiedIdentity } from '../types';

// STUB PROVIDER — no real Google OAuth client ID/secret exists yet.
//
// Real Google Sign-In would receive a Google ID token from the client,
// verify its signature against Google's published JWKS, and pull
// `sub` / `name` / `email` / `email_verified` out of the verified payload.
// That verification step is the only thing this file fakes: everything
// downstream (authenticate(), session issuance, guest migration) works the
// same either way, because it only ever sees the VerifiedIdentity shape,
// never a raw token. Swapping in real verification later means rewriting
// the body of `verifyGoogleCredential` — no caller changes.
//
// `credential` here is whatever the (also stubbed) /login form sends: an
// email + display name the developer typed in to simulate "the Google
// account that signed in." Using the email as providerUserId is a stand-in
// for Google's real `sub` claim, and lets a developer simulate "log in as
// the same account again" by reusing the same email.
export interface GoogleStubCredential {
	email: string;
	displayName: string;
}

export function verifyGoogleCredential(credential: GoogleStubCredential): VerifiedIdentity {
	const email = credential.email.trim().toLowerCase();
	if (!email) {
		throw new Error('Stub Google credential requires an email');
	}

	return {
		provider: 'google',
		providerUserId: email,
		displayName: credential.displayName.trim() || email,
		email,
		// The stub always reports the email as verified. A real integration
		// must read this from Google's `email_verified` claim, since
		// auto-linking an existing account by email is only safe when
		// Google itself vouches for the address (see CLAUDE.md Authentication).
		emailVerified: true
	};
}

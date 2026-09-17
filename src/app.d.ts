// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Role } from '$lib/server/auth/types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Set when the `auth_session` cookie verifies. A learner is either
			// signed in (`user` set) or anonymous (`guestSessionId` set) — see
			// src/hooks.server.ts.
			user: { id: string; displayName: string; role: Role } | null;
			guestSessionId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

// `User.role` and `AuthIdentity.provider` are conceptually enums, but stored
// as `String` columns in prisma/schema.prisma because Prisma's `enum` type
// isn't supported on the sqlite connector (see schema comment). These union
// types + guards are the app-level substitute; validate at every boundary
// where a role/provider value crosses in from the DB or a request.

export const ROLES = ['learner', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
	return (ROLES as readonly string[]).includes(value);
}

// Google is the only sign-in method at launch. Keeping this a union (rather
// than a single literal) is what lets a second provider be added later
// without touching the AuthIdentity schema.
export const AUTH_PROVIDERS = ['google'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export function isAuthProvider(value: string): value is AuthProvider {
	return (AUTH_PROVIDERS as readonly string[]).includes(value);
}

// What a provider hands back after successfully verifying a credential.
// This is the shape `authenticate()` works with — provider-specific verify
// logic (e.g. validating a Google ID token) lives in ./providers/*.ts and
// never leaks past this interface.
export interface VerifiedIdentity {
	provider: AuthProvider;
	providerUserId: string;
	displayName: string;
	email: string | null;
	emailVerified: boolean;
}

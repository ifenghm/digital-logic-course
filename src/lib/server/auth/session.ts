import 'dotenv/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';

// Signed-cookie session for signed-in users. No `sessions` table: there is
// no revoke-all-devices or admin-kill-session requirement yet (CLAUDE.md
// doesn't sketch a sessions table), so a stateless signed cookie is enough
// and avoids a DB round trip on every request. Add a sessions table later
// if revocation becomes a real requirement — that's a routing/verify change
// here, not a schema change to User/AuthIdentity.
export const SESSION_COOKIE_NAME = 'auth_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface SessionPayload {
	userId: string;
	exp: number;
}

function getSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		throw new Error('SESSION_SECRET is not set');
	}
	return secret;
}

function sign(data: string): string {
	return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(userId: string, now: Date = new Date()): string {
	const payload: SessionPayload = { userId, exp: now.getTime() + SESSION_TTL_MS };
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const signature = sign(encodedPayload);
	return `${encodedPayload}.${signature}`;
}

// Returns the userId if `token` is a well-formed, correctly signed,
// unexpired session token; otherwise null. Never throws on malformed input.
export function verifySessionToken(token: string, now: Date = new Date()): string | null {
	const parts = token.split('.');
	if (parts.length !== 2) return null;
	const [encodedPayload, signature] = parts;

	const expectedSignature = sign(encodedPayload);
	const a = Buffer.from(signature);
	const b = Buffer.from(expectedSignature);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

	let payload: SessionPayload;
	try {
		payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
	} catch {
		return null;
	}

	if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null;
	if (now.getTime() >= payload.exp) return null;

	return payload.userId;
}

export function setSessionCookie(cookies: Cookies, userId: string): void {
	cookies.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: SESSION_TTL_MS / 1000
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

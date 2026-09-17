import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from './session';

describe('session tokens', () => {
	it('round-trips the userId that signed it', () => {
		const token = createSessionToken('user-123');
		expect(verifySessionToken(token)).toBe('user-123');
	});

	it('rejects a token whose signature was tampered with', () => {
		const token = createSessionToken('user-123');
		const [payload, signature] = token.split('.');
		const tampered = `${payload}.${signature.slice(0, -1)}${signature.at(-1) === 'a' ? 'b' : 'a'}`;
		expect(verifySessionToken(tampered)).toBeNull();
	});

	it('rejects a payload edited to claim a different userId', () => {
		const token = createSessionToken('user-123');
		const forgedPayload = Buffer.from(JSON.stringify({ userId: 'someone-else', exp: Date.now() + 1e9 })).toString(
			'base64url'
		);
		const [, signature] = token.split('.');
		expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
	});

	it('rejects an expired token', () => {
		const issuedAt = new Date('2026-01-01T00:00:00Z');
		const token = createSessionToken('user-123', issuedAt);
		const wellAfterExpiry = new Date('2026-03-01T00:00:00Z');
		expect(verifySessionToken(token, wellAfterExpiry)).toBeNull();
	});

	it('rejects malformed tokens without throwing', () => {
		expect(verifySessionToken('not-a-valid-token')).toBeNull();
		expect(verifySessionToken('')).toBeNull();
		expect(verifySessionToken('a.b.c')).toBeNull();
	});
});

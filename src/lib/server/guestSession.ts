import type { GuestSession } from '@prisma/client';
import { prisma } from './db';

export const GUEST_SESSION_COOKIE_NAME = 'guest_session';

export async function createGuestSession(): Promise<GuestSession> {
	return prisma.guestSession.create({ data: {} });
}

// Looks up a guest session by its cookie value. Returns null for an unknown
// id or one that has already been consumed by a migration (see
// migrateGuestToUser.ts) — a consumed id must not be usable again.
export async function getActiveGuestSession(id: string): Promise<GuestSession | null> {
	const session = await prisma.guestSession.findUnique({ where: { id } });
	if (!session || session.consumedAt) return null;
	return session;
}

export async function touchGuestSession(id: string): Promise<void> {
	await prisma.guestSession.update({
		where: { id },
		data: { lastSeenAt: new Date() }
	});
}

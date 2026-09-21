// This module is imported both by the SvelteKit app (via Vite) and by the
// plain `tsx prisma/seed.ts` script (no Vite involved) — so it can't rely on
// SvelteKit's `$env/dynamic/private` (a virtual module Vite provides, which
// `tsx` doesn't understand). Loading dotenv directly here works in both.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
// `@prisma/client`'s CJS entrypoint re-exports the generated client via a
// dynamic `{ ...require(...) }` spread, which Node's ESM/CJS interop can't
// statically see as a named export — so this has to be a default import,
// not `import { PrismaClient } from '@prisma/client'`.
import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const { PrismaClient } = pkg;

// Prisma 7 requires a driver adapter (no more bare `datasourceUrl`/
// connection-string constructor option). This talks to hosted Postgres
// (Supabase) via `@prisma/adapter-pg` — the rest of the app only ever
// imports `prisma` from this file.
function createAdapter() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set');
	return new PrismaPg({ connectionString: url });
}

// One client per process. In dev, Vite's module reload would otherwise spawn
// a fresh client (and a fresh connection pool) on every file change, so we
// stash it on `globalThis` to survive HMR.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter: createAdapter()
	});

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}

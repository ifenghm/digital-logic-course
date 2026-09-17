import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { config } from 'dotenv';

// Runs once before the whole test run (Vitest `globalSetup`), in the parent
// process — so setting process.env here is inherited by every test worker
// spawned after it. Points the app at a throwaway SQLite file distinct from
// the dev database, migrates it from scratch, and seeds it the same way
// `pnpm db:seed` does, so tests see the same Unit rows the app does.
export default async function setup() {
	config({ path: '.env.test', override: true });

	const dbFile = 'prisma/test.db';
	for (const suffix of ['', '-journal', '-wal', '-shm']) {
		if (existsSync(dbFile + suffix)) rmSync(dbFile + suffix);
	}

	execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
	execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });
}

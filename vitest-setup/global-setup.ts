import { execSync } from 'node:child_process';
import { config } from 'dotenv';

// Runs once before the whole test run (Vitest `globalSetup`), in the parent
// process — so setting process.env here is inherited by every test worker
// spawned after it. (Re)creates the throwaway local Postgres container from
// docker-compose.yml (see .env.test.example), migrates it from scratch, and
// seeds it the same way `pnpm db:seed` does, so tests see the same Unit
// rows the app does. Deliberately never touches the hosted Supabase project
// dev uses — the container has its own DATABASE_URL, and recreating it
// (rather than running `prisma migrate reset` against it) avoids Prisma's
// AI-agent safety gate on destructive commands, which doesn't distinguish
// "local throwaway container" from "real database".
export default async function setup() {
	config({ path: '.env.test', override: true });

	execSync('docker compose up -d --force-recreate --renew-anon-volumes test-db', {
		stdio: 'inherit'
	});
	waitForPostgresReady();

	execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
	execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });
}

function waitForPostgresReady(retries = 30) {
	for (let attempt = 0; attempt < retries; attempt++) {
		try {
			execSync('docker compose exec -T test-db pg_isready -U postgres -d postgres', {
				stdio: 'ignore'
			});
			return;
		} catch {
			execSync('sleep 1');
		}
	}
	throw new Error('Postgres test container did not become ready in time');
}

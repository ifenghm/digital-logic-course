import { config } from 'dotenv';

// Runs inside each test worker before its test files. Belt-and-suspenders
// alongside global-setup.ts's process.env inheritance: guarantees this
// worker has the test DATABASE_URL/SESSION_SECRET even if env inheritance
// from the parent process ever changes with a future Vitest version.
config({ path: '.env.test', override: true });

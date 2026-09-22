import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';

// Unauthenticated liveness/readiness check: confirms the app is serving
// requests AND can reach the database. Also doubles as the target for the
// daily Vercel Cron ping (see vercel.json) that keeps the free-tier Supabase
// project from auto-pausing after a week of no traffic — see DEPLOYMENT.md.
export const GET: RequestHandler = async () => {
	await prisma.unit.count();
	return json({ status: 'ok' });
};

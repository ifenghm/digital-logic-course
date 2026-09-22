# Deployment

This app is hosted on **Vercel's free Hobby tier**. Vercel was picked over
alternatives (Netlify, Render, Railway) because:

- The app already uses `@sveltejs/adapter-vercel` — zero server config beyond
  what's in this repo (`vite.config.ts`, `vercel.json`).
- SSR, server-side form actions, and httpOnly cookies (the guest-session and
  `auth_session` cookies — see CLAUDE.md) all work out of the box on Vercel's
  Node.js serverless functions.
- The database is already external (Supabase Postgres), so it isn't tied to
  whichever host runs the app — Vercel only needs a `DATABASE_URL`.
- Unlike Render/Railway's free tiers, Vercel's Hobby functions don't sleep
  after inactivity, so there's no cold-start delay for a learner's first
  request. (The database *can* sleep — see "Keeping the free Supabase project
  alive" below, which is the actual thing that can take this site down.)

This doc covers the one-time setup and the small amount of ongoing care a
free-tier deployment needs to keep running. The account-creation and
dashboard steps below have to be done by a human in a browser (Claude can't
click through Vercel's or Google's UI on your behalf) — everything else is
already committed to the repo.

## One-time setup

### 1. Prerequisites

- The GitHub repo (`ifenghm/digital-logic-course`) — already exists.
- A Supabase project for production Postgres — already exists; its
  connection string is your production `DATABASE_URL` (see `.env.example`
  for the format and the `@` percent-encoding gotcha).
- A Google Cloud OAuth client ID (Feature 3 / Authentication) — already
  exists for local dev. You'll add the production domain to it in step 4.

### 2. Create the Vercel project

1. Sign in to [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project**, import `ifenghm/digital-logic-course`.
3. Vercel auto-detects the SvelteKit framework preset. Leave build settings
   as detected — `vercel.json` in this repo already overrides the build
   command to run migrations and seed the `units` table before building (see
   "What happens on every deploy" below), and `package.json`'s
   `engines.node` pins the Node 22 runtime Prisma 7 requires.
4. Don't click Deploy yet — set environment variables first (next step).

### 3. Set environment variables

In **Project Settings → Environment Variables**, add the same three
variables documented in `.env.example`:

| Name | Value | Environments |
|---|---|---|
| `DATABASE_URL` | Your Supabase connection string | **Production only** |
| `SESSION_SECRET` | A freshly generated secret — `openssl rand -base64 32`. **Do not reuse** the dev value from `.env`. | **Production only** |
| `PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID | Production, Preview, Development |

**Scope the first two to Production only** (uncheck Preview/Development).
Vercel builds a Preview deployment for every branch/PR pushed to GitHub; with
`DATABASE_URL` unset there, a preview build fails fast with a clear "not
set" error instead of silently running `prisma migrate deploy` against your
real production database from a half-finished branch. If you later want
working previews, give them their own separate Supabase project/database
rather than pointing them at production.

### 4. Deploy, then finish Google Sign-In setup

1. Click **Deploy**. First deploy takes a bit longer than subsequent ones
   (installing `pnpm`, running `prisma migrate deploy` against a fresh
   database, etc.) — watch the build log for errors.
2. Once live, note the assigned domain (`https://<project>.vercel.app`, or
   your custom domain if you add one under Project Settings → Domains).
3. In [Google Cloud Console](https://console.cloud.google.com/) → **APIs &
   Services → Credentials**, open the OAuth 2.0 Client ID used for
   `PUBLIC_GOOGLE_CLIENT_ID` and add the production URL to **Authorized
   JavaScript origins** (e.g. `https://<project>.vercel.app`). This app uses
   Google's ID-token ("Sign In With Google" button) flow — see
   `src/lib/server/auth/providers/google.ts` — so only the JS origin needs
   adding, not a redirect URI.
4. Smoke-test on the live URL: load the homepage, start Unit 1 as a guest
   (confirms the guest-session cookie + DB write work), then sign in with
   Google (confirms the origin change took effect) and check the guest
   progress migrated onto the account.

From here, every push to `main` auto-deploys.

## What happens on every deploy

`vercel.json` overrides Vercel's build command to:

```
pnpm db:deploy && pnpm db:seed && pnpm build
```

- `db:deploy` runs `prisma migrate deploy` — applies any new migrations
  under `prisma/migrations/` to the production database. Safe to run on
  every deploy: it's a no-op when there's nothing pending.
- `db:seed` re-runs `prisma/seed.ts`, which `upsert`s the `units` table from
  `src/lib/content/units`. Also idempotent, and means editing unit
  titles/order in code takes effect on the next deploy with no manual DB step.
- `pnpm build` is the normal SvelteKit production build.

This means: to ship a schema change, commit the migration under
`prisma/migrations/` (via `pnpm db:migrate` locally against your dev
database) and push — Vercel applies it to production automatically on
deploy. There's no separate "run migrations" step to remember or forget.

## Keeping the free Supabase project alive

**This is the main risk to "the site continues running."** Supabase's free
tier automatically pauses a project after ~7 days with no API/database
activity. A paused project makes every DB-backed request on the site fail
(login, guest progress, everything except static pages) until someone
manually un-pauses it from the Supabase dashboard.

Two things in this repo work together to prevent that:

- `src/routes/api/health/+server.ts` — an unauthenticated route that runs a
  trivial query (`prisma.unit.count()`) and returns `{ status: "ok" }`. It
  exists specifically to generate real database activity, not just prove the
  web server is up.
- `vercel.json`'s `crons` entry hits that route once a day (`0 12 * * *`,
  i.e. noon UTC). One request a day is comfortably inside the free Vercel
  Hobby cron allowance and far more often than Supabase's 7-day pause
  threshold, so the database should never go idle long enough to pause.

Nothing further to configure — this is live as soon as the project is
deployed. If you ever want an outside confirmation that the site itself is
up (not just the DB), point a free uptime checker (e.g.
[UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org))
at `https://<your-domain>/api/health` too — that adds independent alerting
if the site goes down, on top of (not instead of) the Vercel cron above.

If a pause ever does happen anyway (e.g. you move off Vercel, or delete the
cron): Supabase dashboard → the paused project → **Restore project**. No
data is lost; it just needs a manual click to wake back up.

## Rotating `SESSION_SECRET`

Changing `SESSION_SECRET` invalidates every existing signed-in session
immediately (all `auth_session` cookies fail their HMAC check and are
treated as logged out) — guest sessions and their progress are unaffected,
since those aren't signed with this secret. Only do this if the secret may
have leaked; otherwise leave it alone indefinitely.

## Troubleshooting

- **Google Sign-In fails only in production ("origin not allowed" in the
  browser console):** the production domain wasn't added to the OAuth
  client's Authorized JavaScript origins (step 4 above), or was added but
  Google's cache hasn't caught up yet (usually seconds, occasionally a few
  minutes).
- **Build fails with `DATABASE_URL is not set`:** expected for Preview
  deployments per the scoping in step 3 above; a problem only if it happens
  on a Production deploy, which means the env var scope was misconfigured.
- **Requests start failing with Postgres connection errors after a period of
  low traffic:** check whether the Supabase project shows as paused in its
  dashboard — see "Keeping the free Supabase project alive" above.
- **`ERR_PNPM_UNSUPPORTED_ENGINE` locally:** your local Node version doesn't
  match `package.json`'s `engines.node` (`22.x`, matching `.nvmrc`). Run
  `nvm use` first.

# CLAUDE.md

This file gives Claude context about this project. Read it before making changes, and keep it updated as decisions are made.

## Overview

This project is a multi-unit course website that teaches digital logic from the ground up. Learners start with **truth tables** and finish able to build:

- "Hello World" — as a circuit (no programming language), built entirely from gates the learner has already wired
- Adders (half adder, full adder, multi-bit adders)
- Multiplexers
- Sequential circuits (latches, flip-flops, a simple register or counter) that hold state across clock cycles — the step that takes the course from pure combinational logic toward actually simulating computation

Each unit builds on the previous one, so content, quizzes, and progress tracking should all respect unit order.

## Features

1. **Progress tracking.** The site tracks each learner's progress in `localStorage` so it works instantly and offline. Progress is also saved to a database so it persists across devices and browsers.
   - **1b. Auth-ready database design.** Design the database so the backend can easily add authenticated Google sign-in, without restructuring user or progress data.
   - **1c. Anonymous guest sessions (server-side).** A learner does not need an account to take the course. On first visit, the server issues a session id via an httpOnly, secure cookie (not readable/writable by page JS) and creates a matching row in `guest_sessions`. That id is the guest's durable identity, and `progress` rows are keyed to it exactly the way they're keyed to `user_id` for signed-in learners. `localStorage` (Feature 1) stays the fast local cache in both cases; the guest-session cookie is what makes a guest's progress durable server-side without requiring login.
2. **Admin-managed quizzes.** An admin can add and edit quizzes through the site, without code changes.
3. **Sign-in and account migration.** Google Sign-In is the only way to create or log into an account (see Authentication below). A learner can take the whole course anonymously first and sign in with Google later; at that point their guest progress is migrated onto the new account rather than lost. See "Anonymous → account migration" under Architecture Notes.
4. **Circuit builder.** A drag-and-drop logic-gate editor (AND/OR/NOT gates, wires, input toggles, an output light) built as a reusable component (`CircuitCanvas.svelte`), not tied to one unit — first used as a freeform sandbox at `/circuits/new`, meant to be reused later for Unit 6 (Hello World), 7 (adders), and 8 (multiplexers) once those have content. Saving/sharing is signed-in-only (unlike progress, there's no guest-session path for circuits): a saved circuit gets a shareable read-only URL, and anyone signed in can fork it (copy it into their own account and keep editing) via `?/fork`. See "Circuit builder" under Architecture Notes.

## Proposed Course Structure (draft)

Adjust this as the curriculum is finalized. The "Est. self-paced time" column is a rough estimate, not measured data — see TODOs below.

| Unit | Topic | Outcome | Est. self-paced time |
|------|-------|---------|------------------------|
| 1 | Truth tables | Read and build truth tables for basic expressions | 30–45 min |
| 2 | Logic gates | Understand AND, OR, NOT, NAND, NOR, XOR, XNOR | 45–60 min |
| 3 | Boolean algebra | Simplify expressions (identities, De Morgan's laws) | 1.5–2 hrs |
| 4 | Karnaugh maps & minimization | Minimize Boolean expressions graphically (K-maps, SOP/POS forms, don't-cares) | 1.5–2 hrs |
| 5 | Combinational logic | Turn a truth table (or minimized expression) into a gate-level circuit | 1–1.5 hrs |
| 6 | Hello World | Wire a circuit that displays "Hello World" on a multi-character display — no programming language, purely gates + decoders driving each character position | 1–1.5 hrs |
| 7 | Adders | Build half adders, full adders, and ripple-carry adders | 1.5–2 hrs |
| 8 | Multiplexers | Build 2:1 and 4:1 multiplexers | 1–1.5 hrs |
| 9 | Sequential logic | Build latches and flip-flops, then a simple register or counter that remembers state across clock cycles | 2–2.5 hrs |

Total: roughly 11–15 hours across all 9 units. Units 1–2 are intentionally the shortest, to get a learner to their first completed unit quickly. Unit 9 carries the largest estimate — in the reference syllabus below, flip-flops plus counters/registers together were the single heaviest block of the semester (12 of 36 lecture hours), which is reflected here.

**How these estimates were derived:** there's no single authoritative source for "hours per topic" in a self-paced web course, so these are extrapolated from the relative time weight given to each topic in several college digital-logic-design syllabi (contact hours per topic), scaled down for a self-paced, no-lecture, no-exam format. For reference, one representative 16-week syllabus (Texas A&M–Texarkana EE 321) allocated roughly: 6 contact hours to number systems + gates, 9 hours to Boolean simplification/Karnaugh maps, 3 hours to adders, 3 hours to mux/decoders/encoders, 3 hours to flip-flops, and 9 hours to counters/registers.

Sources:
- [COURSE SYLLABUS Digital Logic (EE 321), Texas A&M University–Texarkana](https://www.tamut.edu/faculty/syllabi/202280/80298.pdf)
- [EECS 1100 – Digital Logic Design Course Syllabus, University of Toledo](https://www.utoledo.edu/engineering/electrical-engineering-computer-science/current-students/syllabi/eecs-1100-digital-logic-design.html)

## TODOs

- [ ] **Pilot-test the time estimates.** They're desk research scaled down from semester-length college syllabi, not measurements of this site. Run a few real learners through each unit and adjust.
- [ ] **Decide: should decoders/encoders/demultiplexers be taught alongside multiplexers (Unit 8)?** In comparable courses these are usually introduced together as a family of MSI components, rather than multiplexers alone.
- [ ] Decide whether units unlock in order or are all open from the start (existing open question, unresolved).
- [ ] **Confirm Unit 6's "Hello World" is a static/parallel display, not a serial "typewriter" animation.** Lighting up several character displays at once (each driven directly by a decoder from a fixed input) is pure combinational logic and fits at Unit 6. Making the message actually print character-by-character over time needs something to step through the characters in sequence — that's a counter, i.e. real sequential logic — which isn't introduced until Unit 9. Don't scope Unit 6 around a serial/typing effect.
- [ ] **Optional stretch tie-back at Unit 9.** Once flip-flops/counters exist, consider revisiting "Hello World" as a bonus/capstone exercise: use a counter to step through the message and actually make it print character-by-character. Nice narrative callback, not required for v1.

## Architecture Notes

### Progress tracking
- `localStorage` is the fast, local source of progress data. The database is the durable source.
- Sync local progress to the database when a lesson or quiz is completed, and on login.
- On login from a new device, load progress from the database into `localStorage`.
- Resolve conflicts by merging: a completed lesson stays completed, and the best quiz score wins.
- Wrap every `localStorage` read and write in `try/catch`, and handle empty or corrupted data safely.
- Version the stored data shape, e.g. `{ version: 1, units: {...} }`, so it can be migrated later.

### Authentication (Feature 1b/1c/3)
- Keep a user's identity separate from how they log in. A user is one row in `users`; each login method is a row in `auth_identities`.
- **Google is the only sign-in method.** There is no password login. Keep the `auth_identities` design generic (provider + provider_user_id) anyway, so another provider could be added later without a schema change — but don't build password auth now.
- All app data, including progress and roles, references `users.id`, never a provider-specific ID or email.
- Do not use email as the primary key. Emails can change, and a Google account email may differ from the one used at signup.
- Allow one user to link several identities (kept generic even though Google is the only one shipped at launch).
- Decide how to handle an existing account whose email matches a new Google login. Only auto-link when Google reports the email as verified.
- Keep auth logic behind one interface (e.g. `authenticate(provider, credentials)`) so providers can be added or swapped.
- **Implemented as:** a signed httpOnly cookie (`auth_session`, HMAC'd with `SESSION_SECRET`) carrying the user id, not a `sessions` table — there's no revoke-all-devices/admin-kill-session requirement yet, so a stateless token avoids a DB round trip per request. Add a `sessions` table later if revocation becomes a real requirement; that's a change to `src/lib/server/auth/session.ts`, not to `User`/`AuthIdentity`.

### Anonymous guest identity (Feature 1c)
- A learner never has to sign in to take the course. On first visit, the server creates a `guest_sessions` row and sets its id in an httpOnly, secure, long-lived cookie. This is deliberately a server-issued session id, not a client-generated id kept only in `localStorage` — the guest's durable identity should not be readable or forgeable from page JS.
- `localStorage` still holds the fast local progress cache for guests exactly as it does for signed-in users (see Progress tracking above); the guest-session cookie is only what lets that progress also land durably in the database without an account.
- `progress` rows for a guest reference `guest_session_id` instead of `user_id` (see Data model).

### Anonymous → account migration
- When a guest signs in with Google for the first time, look up their current `guest_session_id` (from the cookie) and migrate: reassign that guest's `progress` rows to the new `user_id`.
- Use the same merge policy as cross-device sync: a completed lesson stays completed, and the best quiz score wins, in case the same unit was ever attempted both anonymously and (on another device) signed in.
- After a successful migration, invalidate the guest session (clear the cookie / mark the `guest_sessions` row consumed) so it can't be replayed or reused.
- If Google sign-in fails partway through, the guest session and its progress must remain intact and usable — migration should be transactional, not destructive-then-create.

### Circuit builder (Feature 4)
- `CircuitCanvas.svelte` (`src/lib/components/`) is the whole interactive editor — an SVG canvas plus a palette of AND/OR/NOT/Input/Output parts — built with custom pointer-event dragging, not the HTML5 drag-and-drop API (which doesn't give live coordinates while dragging, which wires need) and not a DnD library (none in the repo fit free-canvas positioning + wire-dragging). It takes a `$bindable` `graph` prop (a `CircuitGraph` — see `src/lib/circuits/types.ts`) and a `readOnly` prop, so the same component serves the editable and shared-view cases.
- Circuit evaluation (`src/lib/circuits/evaluate.ts`) is pure and framework-free: topologically evaluates the gate graph, memoizing resolved node values, and detects feedback loops (a gate whose output feeds back into its own input, directly or indirectly) without hanging, surfacing them as a `cycleNodeIds` set the UI warns on. This editor targets combinational circuits only (Units 5–8); loops aren't meaningful until sequential logic (Unit 9) exists, so a loop is treated as a user error to warn about, not something to resolve.
- Ownership is signed-in-only — unlike `Progress`, there's no guest-session branch for `Circuit`. A guest can still open `/circuits/new` and build freely (client-only state); clicking Save without being signed in is rejected server-side (`fail(401, ...)` in the `create` action) and the UI shows a sign-in prompt instead of the save form. Unsaved sandbox work is **not** preserved across a login redirect in v1 — acceptable for now since real Google OAuth isn't wired up yet either (see Authentication); worth revisiting once it is.
- Sharing: every circuit has a stable read-only URL at `/circuits/[id]`. The owner sees an editable canvas with Save/Delete; anyone else sees the same canvas in `readOnly` mode with a "Copy & edit this circuit" (fork) action, gated on being signed in. Forking (`forkCircuit` in `src/lib/server/circuits.ts`) copies the source's graph into a new row owned by the forker and records `forkedFromId` — the source is untouched.
- Not built yet: spec-matching/auto-graded circuit exercises (e.g. "wire a circuit matching this truth table"). Unit 5+ content embedding this component for a graded exercise is a separate, larger piece of work (a grading engine) — out of scope for the editor itself.

### Quizzes
- Store quizzes as data in the database, not hardcoded in pages.
- Each quiz belongs to a unit and contains questions such as multiple choice, truth-table fill-in, or circuit-building answers (learner wires gates to match a spec).
- Only authenticated admins may create, edit, or delete quizzes. Enforce this on the server, not only in the UI.
- Editing a quiz should not corrupt existing learners' saved results. Consider quiz versioning.

### Data model (starting sketch)
- `users`: id, display_name, email, email_verified, role (`learner` | `admin`), created_at
- `auth_identities`: id, user_id, provider (`google`, extensible), provider_user_id, created_at, last_login_at
  - Unique constraint on (provider, provider_user_id)
- `guest_sessions`: id (session token), created_at, last_seen_at, consumed_at (nullable — set once migrated to a user)
- `units`: id, order, title, content
- `quizzes`: id, unit_id, title, version
- `questions`: id, quiz_id, type, prompt, options, answer
- `progress`: id, user_id (nullable), guest_session_id (nullable — exactly one of the two is set), unit_id, lessons_completed, quiz_scores, updated_at
- `circuits`: id, owner_id (always set — signed-in only, no guest path), title, graph (JSON-encoded nodes/wires), forked_from_id (nullable, self-relation), created_at, updated_at

**As actually implemented (`prisma/schema.prisma`)**, with the deviations from the sketch above:
- `users`/`auth_identities`/`guest_sessions`/`units` match the sketch (see `role`/`provider` enum note under Tech Stack).
- `progress.lessons_completed` and `progress.quiz_scores` are JSON-encoded `String` columns (parsed/serialized in `src/lib/server/progress.ts`), not native JSON columns — a holdover from when this ran on SQLite (whose Prisma connector's `Json` field support is inconsistent with Postgres's); left as JSON-in-`String` since it still works fine and avoids an unrelated schema change.
- `units.content` doesn't exist as a DB column. Course content (lessons, fill-in exercises, quiz questions) lives in code under `src/lib/content/` instead, per the Conventions section below ("keep course content separate from UI code") — only `id`/`order`/`title` are in the DB, seeded from that content module by `prisma/seed.ts`.
- `quizzes` and `questions` tables don't exist yet — out of scope until Feature 2 (admin-managed quizzes) is built. The Unit 1 quiz is in-code content, scored via `progress.quiz_scores`.
- No `sessions` table — see the Authentication section's note on signed-cookie sessions.
- `circuits` matches the sketch as built. `graph` is a JSON-encoded `CircuitGraph` (`src/lib/circuits/types.ts`), the same JSON-in-`String` approach as `progress.lessons_completed`/`quiz_scores`, parsed/serialized in `src/lib/server/circuits.ts`.

## Tech Stack

- **Framework:** SvelteKit (TypeScript), chosen over a React-based stack for its built-in `transition:`/`animate:` directives — a better fit for the site's page/exercise transitions than pulling in a separate animation library.
- **Database/ORM:** Prisma 7 against hosted Postgres (Supabase), via the `@prisma/adapter-pg` driver adapter (Prisma 7 requires an explicit driver adapter, there's no more bare connection-string option on `PrismaClient`). `DATABASE_URL` (in `.env`, git-ignored) is the Supabase connection string — percent-encode special characters in the password (e.g. `@` → `%40`) or it breaks URL parsing.
  - Prisma config lives in `prisma.config.ts` (Prisma 7 moved the CLI/migration connection config out of `schema.prisma`), not the schema file.
  - `User.role` and `AuthIdentity.provider` are `String` columns (not Prisma's native `enum`) validated against TS union types in `src/lib/server/auth/types.ts` — a holdover from when this ran on SQLite (whose connector doesn't support `enum`), kept as-is since it still works fine on Postgres.
- **Runtime:** Node 22 (pinned via `.nvmrc`) — Prisma 7 doesn't support Node 23. Package manager is pnpm (a plain `npm install` currently hits an npm/arborist bug on this dependency graph; pnpm doesn't).
- **Auth:** Real Google Sign-In (ID-token verification via `google-auth-library`, see Authentication below), behind `PUBLIC_GOOGLE_CLIENT_ID`. When that env var isn't set, `/login` falls back to the dev-only stub form (type an email, it signs you in as that "Google account") — useful for a fresh clone with no Google Cloud credentials configured yet.
- **Hosting:** Vercel (free Hobby tier), via `@sveltejs/adapter-vercel` — see `DEPLOYMENT.md` for setup, what runs on every deploy (`prisma migrate deploy` + re-seeding `units`, via `vercel.json`'s build command), and how the free Supabase database is kept from auto-pausing (a daily cron hitting `/api/health`).

**Local development:**
```
nvm use              # Node 22, per .nvmrc
pnpm install          # also runs `prisma generate` (postinstall)
cp .env.example .env  # then fill in DATABASE_URL (a real Postgres/Supabase connection string),
                       # SESSION_SECRET, and optionally PUBLIC_GOOGLE_CLIENT_ID
pnpm db:migrate       # applies prisma/migrations to the Postgres database in DATABASE_URL
pnpm db:seed          # seeds the units table from src/lib/content
pnpm dev
pnpm test             # runs against a throwaway LOCAL Postgres container (docker-compose.yml),
                       # not the Supabase project above — requires Docker running; see
                       # .env.test.example (copy to .env.test) and vitest-setup/
```

## Current Implementation Status

Built so far: the login system (Feature 1c + 3, with real Google Sign-In) and Unit 1 (truth tables), with automated tests. Specifically:
- Server-side guest sessions, `authenticate()`, anonymous → account migration, and progress-based "resume at the right exercise" routing — see `src/lib/server/`.
- Unit 1 content (`src/lib/content/unit1.ts`): 4 exercises (a reading lesson, two fill-in-the-truth-table exercises for AND/OR, and a multiple-choice check) rendered at `/units/truth-tables/[exercise]`.
- The circuit builder (Feature 4): `CircuitCanvas.svelte`, pure evaluation logic (`src/lib/circuits/`), persistence/sharing/forking (`src/lib/server/circuits.ts`), and routes at `/circuits`, `/circuits/new`, `/circuits/[id]` — see "Circuit builder" under Architecture Notes. Not yet wired into any unit's exercise content (development jumped ahead to build the editor itself first, at the user's request; Units 2–8 content is still unbuilt — see below).
- Tests: `src/lib/server/**/*.test.ts` and `src/lib/circuits/**/*.test.ts` (`pnpm test`), covering session-token signing, the merge/resume progress logic, `authenticate()`'s DB lookup-vs-create behavior, guest→user migration, circuit persistence/forking, and gate-evaluation truth tables (including loop detection).
- Deployment: live on Vercel's free tier, auto-deploying from `main` — see `DEPLOYMENT.md`.

Not yet built (do before relying on these):
- **`localStorage` client-side progress cache** (Feature 1/1a). Progress is currently server-only (DB via guest session or user). The fast local cache + sync-on-completion + login-time merge described under "Progress tracking" below is not implemented — only the server side of that picture exists.
- **Admin-managed quizzes** (Feature 2). The Unit 1 quiz exercise is in-code content like the rest of the unit, not DB-editable — the `quizzes`/`questions` tables from the Data model sketch below don't exist yet.
- Units 2–9 content, a `sessions` table (see Authentication below for why signed-in sessions don't use one yet), unlock-order enforcement between units (still an open question).

## Conventions

- Keep course content separate from UI code.
- Keep all admin-only routes and actions behind a server-side role check.
- Make the site responsive and accessible (keyboard navigation, readable truth tables, alt text for circuit diagrams).

## Open Questions

- ~~Should Google sign-in be the only login method, or sit alongside email/password?~~ **Resolved:** Google is the only sign-in method.
- ~~Do learners need accounts, or can they use the site anonymously with local-only progress?~~ **Resolved:** both — anonymous learners get a server-side guest session (Feature 1c), and can later migrate to a Google account (see Architecture Notes).
- ~~Does the curriculum need a Karnaugh maps / minimization unit?~~ **Resolved:** yes — Unit 4.
- ~~Does the course need a sequential logic unit (latches/flip-flops, registers, counters)?~~ **Resolved:** yes — Unit 9.
- ~~Which language or HDL will learners write functions in (JavaScript, Python, Verilog, VHDL, etc.)?~~ **Resolved: N/A.** The course has no programming language at all — every unit (1–9), including "Hello World," is built as gate circuits. See resolved interaction-model question below.
- Should units unlock in order, or all be open from the start?
- ~~Is the course a drag-and-drop gate/circuit builder, a code-writing exercise, or both?~~ **Resolved: pure drag-and-drop/circuit-building, no code, for the entire course** (confirmed by Irene, Sept 2026). "Hello World" (Unit 6) is a circuit that lights up a fixed multi-character display, not a typed program. See the Unit 6 TODOs above for the static-vs-serial-display nuance this creates.

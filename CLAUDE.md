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

**As actually implemented (`prisma/schema.prisma`)**, with the deviations from the sketch above:
- `users`/`auth_identities`/`guest_sessions`/`units` match the sketch (see `role`/`provider` enum note under Tech Stack).
- `progress.lessons_completed` and `progress.quiz_scores` are JSON-encoded `String` columns (parsed/serialized in `src/lib/server/progress.ts`), not native JSON columns — SQLite's Prisma connector support for a `Json` field type is inconsistent with Postgres's, and this keeps behavior identical across both.
- `units.content` doesn't exist as a DB column. Course content (lessons, fill-in exercises, quiz questions) lives in code under `src/lib/content/` instead, per the Conventions section below ("keep course content separate from UI code") — only `id`/`order`/`title` are in the DB, seeded from that content module by `prisma/seed.ts`.
- `quizzes` and `questions` tables don't exist yet — out of scope until Feature 2 (admin-managed quizzes) is built. The Unit 1 quiz is in-code content, scored via `progress.quiz_scores`.
- No `sessions` table — see the Authentication section's note on signed-cookie sessions.

## Tech Stack

- **Framework:** SvelteKit (TypeScript), chosen over a React-based stack for its built-in `transition:`/`animate:` directives — a better fit for the site's page/exercise transitions than pulling in a separate animation library.
- **Database/ORM:** Prisma 7 with the SQLite connector for local dev, via a driver adapter (`@prisma/adapter-better-sqlite3` — Prisma 7 requires an explicit driver adapter, there's no more bare connection-string option on `PrismaClient`). Moving to hosted Postgres (e.g. Supabase) later: swap `provider` in `prisma/schema.prisma` to `"postgresql"`, swap the adapter in `src/lib/server/db.ts` to `@prisma/adapter-pg` (or similar), point `DATABASE_URL` at the Postgres connection string, and run `prisma migrate dev` again. No application code changes.
  - Prisma config lives in `prisma.config.ts` (Prisma 7 moved the CLI/migration connection config out of `schema.prisma`), not the schema file.
  - Prisma's native `enum` type isn't supported on the sqlite connector, so `User.role` and `AuthIdentity.provider` are `String` columns validated against TS union types in `src/lib/server/auth/types.ts`. This keeps the schema identical when moving to Postgres later.
- **Runtime:** Node 22 (pinned via `.nvmrc`) — Prisma 7 doesn't support Node 23. Package manager is pnpm (a plain `npm install` currently hits an npm/arborist bug on this dependency graph; pnpm doesn't).
- **Auth:** Google Sign-In is stubbed (see Authentication below) — no real OAuth client ID/secret configured yet.

**Local development:**
```
nvm use              # Node 22, per .nvmrc
pnpm install          # also runs `prisma generate` (postinstall)
cp .env.example .env  # then fill in a real SESSION_SECRET for anything beyond local dev
pnpm db:migrate       # applies prisma/migrations to prisma/dev.db
pnpm db:seed          # seeds the units table from src/lib/content
pnpm dev
pnpm test             # runs against a separate throwaway prisma/test.db, see vitest-setup/
```

## Current Implementation Status

Built so far: the login system (Feature 1c + 3, Google stubbed) and Unit 1 (truth tables), with automated tests. Specifically:
- Server-side guest sessions, `authenticate()`, anonymous → account migration, and progress-based "resume at the right exercise" routing — see `src/lib/server/`.
- Unit 1 content (`src/lib/content/unit1.ts`): 4 exercises (a reading lesson, two fill-in-the-truth-table exercises for AND/OR, and a multiple-choice check) rendered at `/units/truth-tables/[exercise]`.
- Tests: `src/lib/server/**/*.test.ts` (`pnpm test`), covering session-token signing, the merge/resume progress logic, `authenticate()`'s DB lookup-vs-create behavior, and guest→user migration.

Not yet built (do before relying on these):
- **`localStorage` client-side progress cache** (Feature 1/1a). Progress is currently server-only (DB via guest session or user). The fast local cache + sync-on-completion + login-time merge described under "Progress tracking" below is not implemented — only the server side of that picture exists.
- **Real Google OAuth.** `src/lib/server/auth/providers/google.ts` is a stub driven by a dev-only form at `/login` (type an email, it signs you in as that "Google account"). Swapping in real ID-token verification only touches that one file.
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

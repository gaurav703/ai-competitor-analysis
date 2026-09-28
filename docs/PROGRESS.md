# Progress

Status: `todo` · `in-progress` · `done`. Phase details: `docs/ROADMAP.md`.

**Current phase:** Phase 1: Foundation & project setup (code done; waiting on Supabase + Upstash setup for the live check)

| Phase | Name | Features | Status |
|---|---|---|---|
| 0 | Project context | n/a | done |
| 1 | Foundation & project setup | n/a | in-progress |
| 2 | Domain model & config | §4 | todo |
| 3 | Source monitoring pipeline | F3 | todo |
| 4 | LLM event extraction & offering taxonomy | F4 | todo |
| 5 | Dedup, importance & timeline | F5, F6, F7 | todo |
| 6 | Onboarding & source discovery | F1, F2 | todo |
| 7 | Offering matrix, pricing & metrics | F8, F9 (part) | todo |
| 8 | Comparison engine & core views | F9, F9b | todo |
| 9 | Patterns & review intelligence | F10, F11 | todo |
| 10 | Alerts, brief, dashboard & validation | F12, F13, F14 | todo |

## Phase 1 checklist

- [x] Confirm tech stack (D-001 accepted: Supabase Postgres + Supabase Auth, Upstash Redis)
- [x] pnpm monorepo: `apps/web`, `apps/worker`, `packages/core`, `packages/db`, `packages/prompts`
- [x] Next.js 16 + TS strict + Tailwind 4 + shadcn/ui-style components (`components.json` ready for `shadcn add`)
- [x] Drizzle schema (`workspaces`, RLS enabled) + first migration `packages/db/drizzle/0000_init.sql`
- [x] Auth pages: sign up, log in, log out, email-confirm callback, route protection in `src/proxy.ts`
- [x] Create workspace flow + dashboard list + workspace page (owner-scoped queries)
- [x] Worker: env check, DB ping, Redis ping, BullMQ `system` queue with heartbeat scheduler
- [x] ESLint, Prettier, Vitest (6 tests), `.env.example`, GitHub Actions CI
- [x] Lint, format, typecheck, tests, web + worker builds all pass locally
- [ ] **User:** create Supabase project + Upstash Redis, fill `.env`
- [ ] Run `pnpm db:migrate` against Supabase
- [ ] Live check: sign up → confirm email → log in → create workspace → see it on dashboard
- [ ] Live check: worker starts and logs "connected to database", "connected to redis", "worker started"
- [ ] First git commit

## Last session

- **2026-09-17:** Phase 0 done. Created `CLAUDE.md`, the spec, roadmap, progress tracker and decision log.
- **2026-09-17:** Added `docs/SYSTEM_DESIGN.md`. D-002 accepted: free OpenRouter models, switchable by env.
- **2026-09-17:** D-001 accepted (Postgres on Supabase over MongoDB). Phase 1 scaffold built and all local checks pass. Not yet run against a real database or Redis.
- **Next step:** user sets up Supabase + Upstash and fills `.env`; run the migration and the live checks; commit; then Phase 2.

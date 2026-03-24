# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npx prisma db push          # Push schema changes to database
npx prisma studio           # Open Prisma Studio (DB GUI)
npx prisma generate         # Regenerate Prisma client after schema changes
```

There are no tests configured in this project.

## Architecture

**Copado** is a Brazilian Portuguese SaaS platform for amateur football (soccer) tournament management.

**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Prisma + PostgreSQL (Supabase) + JWT auth

### Key architectural decisions

- **App Router only** — all routes live under `app/`. No Pages Router.
- **API-first** — `app/api/` contains all backend logic as Route Handlers. There is currently no frontend UI beyond the default Next.js placeholder in `app/page.tsx`.
- **JWT auth** — tokens in `Authorization: Bearer` header (30-day expiry). `lib/auth.ts` exports `getAuthUser(req)` used by all protected routes.
- **Prisma singleton** — `lib/prisma.ts` exports a single client instance reused across requests (dev hot-reload safe).
- **Standings are materialized** — the `Standing` model is recalculated and upserted on every `PATCH /api/matches/[id]` call. Do not derive standings on the fly.

### Data model summary

- `User` → owns `Championship[]`
- `Championship` → has `Team[]`, `Round[]` (auto-generated), `Standing[]`
- `Round` → has `Match[]`
- `Match` → has `Goal[]`, `Card[]`; updating a match recalculates all standings for that championship
- `PageView` — anonymous visitor tracking with source detection (WhatsApp/Instagram/Facebook/direct) via referrer and UTM params

### API surface (`app/api/`)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | — | Create user, returns JWT |
| `/api/auth/login` | POST | — | Login, returns JWT |
| `/api/championships` | GET/POST | ✓ | List / create championships |
| `/api/championships/[id]/rounds` | POST | ✓ | Auto-generate round-robin schedule |
| `/api/matches/[id]` | PATCH | ✓ | Update score/status, recalculates standings |
| `/api/matches/[id]/goals` | POST | ✓ | Record goal event |
| `/api/matches/[id]/cards` | POST | ✓ | Record card event |
| `/api/public/[slug]` | GET | — | Public championship view + pageview tracking |

`app/api/api-routes.ts` documents the full request/response shapes.

### Validation

Zod is used for request body validation in all API routes. Championship formats are `PONTOS_CORRIDOS`, `MATA_MATA`, `GRUPOS_E_MATA_MATA`. Match statuses: `AGENDADA`, `EM_ANDAMENTO`, `ENCERRADA`, `CANCELADA`, `WO`.

### Environment variables

See `docs/deploy-guide-copado.md` for full setup. Required vars:
- `DATABASE_URL` — Supabase transaction pooler (port 6543) for Prisma queries
- `DIRECT_URL` — Supabase session pooler (port 5432) for migrations
- `JWT_SECRET` — used in `lib/auth.ts`

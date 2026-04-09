# Implementation Plan: LinkVault

**Branch**: `main` | **Date**: 2026-04-09 | **Spec**: `../../spec/specification.md`  
**Input**: Feature specification from `/spec/specification.md`

## Summary

LinkVault is a full-stack bookmark manager: NestJS 10 backend (PostgreSQL, TypeORM) + React 18 frontend (TanStack Query, Tailwind). Auth (email/password + Google OAuth) and Tags are already implemented. Remaining work is the LinksModule (CRUD + OG scraping + archive/delete + tag assignment), list/filter/search endpoint, frontend SPA, and deployment config.

## Technical Context

**Language/Version**: TypeScript 5 (Node 20 / React 18)  
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Passport.js, TanStack Query v5, Tailwind CSS v3, axios, cheerio, slugify  
**Storage**: PostgreSQL 16 (local Docker / Neon serverless in prod)  
**Testing**: Jest (unit) + Supertest (e2e)  
**Target Platform**: Linux server (Render) + Vercel (frontend CDN)  
**Project Type**: Web application (REST API + SPA)  
**Performance Goals**: Standard CRUD — no special throughput target  
**Constraints**: Access token 15 min / Refresh 7 days; never `synchronize: true`; max 5 endpoints per resource  
**Scale/Scope**: Personal productivity app; ~1 user per instance initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| All routes protected by JwtAuthGuard | PASS | Implemented in auth module |
| No `synchronize: true` | PASS | TypeORM config uses migrations only |
| Every link/tag has userId FK | PASS | Entities enforce userId (mandatory) |
| Data never leaks across users | PASS | All queries must filter by `req.user.id` |
| Max 5 REST endpoints per resource | PASS | Links has 5 standard + 2 tag-assignment sub-routes |
| No Redis, no nginx, no SSL locally | PASS | Docker Compose has only `api` + `db` |
| Passwords hashed with bcrypt | PASS | saltRounds: 10 in AuthService |

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── rest-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/            ✅ DONE
│   │   ├── users/           ✅ DONE
│   │   ├── tags/            ✅ DONE
│   │   └── links/
│   │       ├── link.entity.ts      ✅ DONE
│   │       ├── links.module.ts     ⬜ TODO
│   │       ├── links.controller.ts ⬜ TODO
│   │       ├── links.service.ts    ⬜ TODO
│   │       ├── scraper.service.ts  ⬜ TODO
│   │       └── dto/
│   │           ├── create-link.dto.ts  ⬜ TODO
│   │           └── update-link.dto.ts  ⬜ TODO
│   ├── migrations/          ✅ InitSchema done; new migration needed for link_tags
│   ├── app.module.ts        ⬜ needs LinksModule added
│   └── main.ts              ✅ DONE
└── test/
    └── links.e2e-spec.ts    ⬜ TODO

frontend/                    ⬜ TODO (entire SPA)
├── src/
│   ├── api/
│   │   ├── client.ts        (axios + interceptors)
│   │   ├── auth.ts
│   │   ├── links.ts
│   │   └── tags.ts
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── LinkCard.tsx
│   │   ├── TagBadge.tsx
│   │   └── AddLinkModal.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── Dashboard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLinks.ts
│   │   └── useTags.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

**Structure Decision**: Web application (Option 2). Backend and frontend are separate directories. Backend is NestJS monolith; frontend is a Vite + React SPA.

## Complexity Tracking

No constitution violations. All design choices follow CLAUDE.md constraints directly.

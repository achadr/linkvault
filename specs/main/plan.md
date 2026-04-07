# Implementation Plan: LinkVault

**Branch**: `main` | **Date**: 2026-04-07 | **Spec**: `spec/specification.md`
**Input**: Feature specification from `/spec/specification.md`

## Summary

LinkVault is a personal link-bookmarking web application where authenticated users can save, tag, search, and archive URLs. The backend is a NestJS REST API backed by PostgreSQL (with TypeORM migrations), exposing JWT + Google OAuth auth plus CRUD endpoints for links and tags. The frontend is a React 18 SPA (Vite + Tailwind + TanStack Query) that consumes the API with an in-memory access token and httpOnly cookie refresh-token strategy.

## Technical Context

**Language/Version**: TypeScript 5.x (backend + frontend)
**Primary Dependencies**:
- Backend: NestJS 10, TypeORM 0.3, Passport.js (jwt + google-oauth20), bcrypt, axios + cheerio, slugify, class-validator
- Frontend: React 18, Vite, TanStack Query v5, axios, react-router-dom v6, Tailwind CSS v3

**Storage**: PostgreSQL 16 (local Docker / Neon serverless in prod)
**Testing**: Jest (unit, NestJS test harness) + Supertest (e2e)
**Target Platform**: Linux container (Render) for backend; static CDN (Vercel) for frontend
**Project Type**: web-service (backend) + web-app (frontend)
**Performance Goals**: < 300 ms p95 on link create (OG scrape has 5 s timeout); paginated list at 20 items/page
**Constraints**: No Redis, no nginx, no synchronize:true; max 5 REST endpoints per resource; access token never in localStorage
**Scale/Scope**: Single-user personal tool → small multi-user SaaS potential; 10 k links/user upper bound

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constraints derived from `CLAUDE.md` (no constitution.md authored yet):

| Gate | Status | Notes |
|------|--------|-------|
| Every link/tag has userId FK (mandatory) | PASS | Entities already define userId with FK |
| Never return another user's data (filter by req.user.id) | PASS | Enforced in services |
| No synchronize: true in TypeORM | PASS | CLI migrations only |
| Max 5 REST endpoints per resource | PASS | Links: 5 (POST, GET, PATCH, PATCH/archive, DELETE); Tags: 3 |
| Access token in JS memory, refresh in httpOnly cookie | PASS | Spec + plan both specify this |
| Passwords hashed bcrypt saltRounds 10 | PASS | auth.service implements this |
| Named exports only | PASS | CLAUDE.md code style |
| No `any` types / strict mode | PASS | tsconfig strict |
| DTOs validated with class-validator | PASS | RegisterDto, LoginDto already done |

No violations — no complexity justification needed.

## Project Structure

### Documentation (this feature)

```text
specs/main/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── openapi.yaml
│   └── endpoints.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-refresh.strategy.ts
│   │   │   │   └── google.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── jwt-refresh.guard.ts
│   │   │   │   └── google-auth.guard.ts
│   │   │   ├── decorators/
│   │   │   │   └── current-user.decorator.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       └── login.dto.ts
│   │   ├── users/
│   │   │   ├── user.entity.ts
│   │   │   ├── users.module.ts
│   │   │   └── users.service.ts
│   │   ├── links/
│   │   │   ├── link.entity.ts
│   │   │   ├── links.module.ts
│   │   │   ├── links.controller.ts
│   │   │   ├── links.service.ts
│   │   │   ├── scraper.service.ts
│   │   │   └── dto/
│   │   │       ├── create-link.dto.ts
│   │   │       └── update-link.dto.ts
│   │   └── tags/
│   │       ├── tag.entity.ts
│   │       ├── tags.module.ts
│   │       ├── tags.controller.ts
│   │       ├── tags.service.ts
│   │       └── dto/create-tag.dto.ts
│   ├── migrations/
│   │   └── 1711900000000-InitSchema.ts
│   ├── app.module.ts
│   ├── data-source.ts
│   └── main.ts
├── test/
│   ├── auth.e2e-spec.ts
│   └── links.e2e-spec.ts
├── Dockerfile
├── .env.example
└── package.json

frontend/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── links.ts
│   │   └── tags.ts
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── LinkCard.tsx
│   │   ├── TagBadge.tsx
│   │   ├── StatCard.tsx
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
├── tailwind.config.js
└── package.json
```

**Structure Decision**: Web application (Option 2). Backend at `/backend`, frontend at `/frontend`, as already established in the project.

## Complexity Tracking

No violations requiring justification.

# LinkVault — Claude Rules

## Stack
- Backend: NestJS 10 + TypeORM 0.3 + PostgreSQL 16
- Frontend: React 18 + TanStack Query v5 + Tailwind CSS v3
- Auth: JWT (email/password) + OAuth Google via Passport.js
- Infra local: Docker Compose (2 services: api + db)
- Migrations: TypeORM CLI only (NEVER synchronize: true)
- Tests: Jest (unit) + Supertest (e2e)

## Deployment targets
- Frontend: Vercel (env var: VITE_API_URL)
- Backend: Render (env vars set in Render dashboard)
- Database: Neon (serverless PostgreSQL, env var: DATABASE_URL)

## Hard constraints
- Every link and tag belongs to a user (userId FK, mandatory)
- Never return data from another user — always filter by req.user.id
- No Redis, no nginx, no SSL config locally
- No synchronize: true in TypeORM config
- Max 5 REST endpoints per resource
- Always prefer well-established libraries over custom implementations
- Dockerfile must exist for prod portability

## Auth rules
- JWT: access token (15min) + refresh token (7 days) in httpOnly cookie
- Google OAuth: Passport strategy, callback redirects to frontend with JWT
- All routes except /auth/* are protected by JwtAuthGuard
- Passwords hashed with bcrypt (saltRounds: 10)

## Code style
- TypeScript strict mode everywhere
- Named exports only (no default exports except React components)
- No `any` types
- class-validator + class-transformer for all DTOs
- Errors: use NestJS built-in exceptions (NotFoundException, UnauthorizedException…)

## File structure
- Backend: src/modules/{auth,users,links,tags}/
- Frontend: src/components/, src/pages/, src/hooks/, src/api/

## Token efficiency
- Implement one task at a time
- Do not refactor unless the task explicitly says so
- Do not add features not listed in the current task

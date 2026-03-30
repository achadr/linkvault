# Constitution — LinkVault

## Purpose
LinkVault is a multi-user personal link manager.
Each user has their own private vault of saved URLs with tags and search.
Users authenticate via email/password or Google OAuth.

## Core principles
- The spec is the single source of truth — code is generated from it
- One task = one isolated, testable, PR-ready feature
- YAGNI: build only what is in the spec, nothing more
- Tests are not optional — every endpoint needs unit + e2e coverage
- Data isolation is non-negotiable: a user must never see another user's data
- Docker Compose must work with a single `docker compose up` locally

## Deployment model
- Local: Docker Compose (api + db)
- Production: Render (API) + Neon (PostgreSQL) + Vercel (frontend)
- Dockerfile exists in /backend for portability

## Non-goals (out of scope)
- Sharing vaults between users
- Public links / public profiles
- Browser extension
- Real-time features (websockets, SSE)
- Email notifications
- Mobile app
- Admin panel

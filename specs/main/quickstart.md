# Quickstart — LinkVault

*Phase 1 output. Local development setup.*

---

## Prerequisites

- Docker Desktop (for local PostgreSQL)
- Node.js 20 LTS
- npm 10+
- A Google Cloud project with OAuth 2.0 credentials (for Google login)

---

## 1. Clone & configure env

```bash
git clone <repo>
cd linkvault

# Backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your values (see below)
```

**Required env vars** (`backend/.env`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkvault
JWT_SECRET=change-me-dev
JWT_REFRESH_SECRET=change-me-dev-refresh
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=3000
```

---

## 2. Start the database

```bash
docker compose up db -d
```

Starts PostgreSQL 16 on port 5432.

---

## 3. Run migrations

```bash
cd backend
npm install
npm run migration:run
```

Creates tables: `user`, `link`, `tag`, `link_tags`.

---

## 4. Start the backend

```bash
# still in backend/
npm run start:dev
```

API available at `http://localhost:3000`.

---

## 5. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

---

## 6. Verify

```bash
# Register a user
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test"}' | jq .

# Expected: { "accessToken": "..." }
```

---

## Common commands

| Command | What it does |
|---------|-------------|
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:generate -- -n MigrationName` | Generate new migration from entity diff |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests (requires running DB) |
| `npm run build` | Compile TypeScript for production |

---

## Production deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Database | Neon (serverless PG) | Copy connection string → set as `DATABASE_URL` on Render |
| Backend | Render | Build: `npm run build`; Start: `node dist/main`; set all env vars |
| Frontend | Vercel | Set `VITE_API_URL` to Render URL; `vercel.json` handles SPA rewrites |

Neon requires SSL — TypeORM is configured with `ssl: { rejectUnauthorized: false }` when `NODE_ENV=production`.

# Technical Plan — LinkVault

## Backend — NestJS

### Project structure
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── jwt-refresh.strategy.ts
│   │   │   │   └── google.strategy.ts
│   │   │   ├── guards/
│   │   │   │   └── jwt-auth.guard.ts
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
│   ├── app.module.ts
│   └── main.ts
├── test/
│   └── links.e2e-spec.ts
├── Dockerfile
├── .dockerignore
├── .env
├── .env.example
└── package.json
```

### Key dependencies
- @nestjs/passport + passport + passport-jwt + passport-google-oauth20
- @nestjs/jwt
- bcrypt + @types/bcrypt
- @nestjs/typeorm + typeorm + pg
- axios + cheerio (Open Graph scraping)
- class-validator + class-transformer
- slugify

## Frontend — React

### Project structure
```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts        (axios instance with interceptors)
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

### Key dependencies
- @tanstack/react-query v5
- axios
- react-router-dom v6
- tailwindcss + autoprefixer + postcss

### Auth flow (frontend)
- Axios interceptor: auto-attach access token from memory (not localStorage)
- On 401: call /auth/refresh, retry original request
- On refresh fail: redirect to /login
- Google OAuth: window.location redirect to /auth/google

## Infrastructure

### Docker Compose (local dev only)
```yaml
services:
  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment: POSTGRES_DB/USER/PASSWORD
    volumes: [postgres_data:/var/lib/postgresql/data]

  api:
    build: ./backend
    ports: ["3000:3000"]
    env_file: ./backend/.env
    depends_on: [db]
```

### Dockerfile (backend — prod portability)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Environment variables

**Backend (.env local / Render dashboard)**
```
DATABASE_URL=postgresql://postgres:postgres@db:5432/linkvault
JWT_SECRET=change-me-in-prod
JWT_REFRESH_SECRET=change-me-in-prod-too
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
FRONTEND_URL=http://localhost:5173
PORT=3000
```

**Frontend (.env local / Vercel dashboard)**
```
VITE_API_URL=http://localhost:3000
```

### Production setup (Render + Neon + Vercel)
- Neon: crée un projet → copie DATABASE_URL → colle dans Render
- Render: connecte GitHub repo → Build Command: `npm run build` → Start: `node dist/main`
- Vercel: connecte GitHub repo → VITE_API_URL = URL Render

## Implementation phases
1. Infra (Docker + NestJS init + TypeORM + migrations)
2. Auth (register/login/logout/refresh + Google OAuth)
3. Links + Tags backend (CRUD + scraping + search)
4. Tests (unit + e2e)
5. Frontend (React + auth flow + dashboard + composants)
6. Déploiement (Neon + Render + Vercel)

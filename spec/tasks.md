# Tasks — LinkVault v2 (avec auth + déploiement)

> Lancer une tâche à la fois dans Claude Code : `/speckit.implement T01`
> Ne jamais lancer plusieurs tâches en parallèle.

---

## Phase 1 — Infrastructure

### [X] T01 — Docker Compose + PostgreSQL
**Goal**: `docker compose up` démarre api + db sans erreur
**Deliverables**:
- docker-compose.yml (api + db)
- backend/.env + backend/.env.example
- Verify: `docker compose up` → api accessible sur :3000

### T02 — NestJS init + TypeORM + Dockerfile
**Goal**: NestJS connecté à PostgreSQL, Dockerfile multi-stage prêt
**Deliverables**:
- NestJS scaffoldé dans /backend
- TypeORM configuré via DATABASE_URL
- Dockerfile multi-stage (builder + runner)
- .dockerignore
- Verify: `npm run start:dev` connecte à la DB

### T03 — Entities + migrations
**Goal**: Tables User, Link, Tag, link_tags créées via migration
**Deliverables**:
- user.entity.ts (id, email, name, password, googleId, createdAt)
- link.entity.ts (id, url, title, description, userId, createdAt, archivedAt)
- tag.entity.ts (id, name, slug, userId, createdAt) + unique(slug, userId)
- ManyToMany: link_tags join table
- Migration: 001_init_schema
- Verify: `npm run migration:run` crée toutes les tables

---

## Phase 2 — Authentification

### T04 — Register + Login (JWT email/password)
**Goal**: Créer un compte et se connecter avec JWT en httpOnly cookie
**Deliverables**:
- UsersModule + UsersService (findByEmail, create)
- AuthModule + AuthService
- RegisterDto (email, password, name) + LoginDto
- POST /auth/register → crée user, retourne access token
- POST /auth/login → vérifie password bcrypt, set cookies JWT
- JwtStrategy + JwtAuthGuard
- Verify: register puis login retourne 200 avec cookie

### T05 — Refresh token + Logout
**Goal**: Rotation du token sans re-login
**Deliverables**:
- POST /auth/refresh → lit refresh cookie, retourne nouveau access token
- POST /auth/logout → clear les deux cookies
- JwtRefreshStrategy
- GET /auth/me → retourne user connecté
- Verify: access token expiré → refresh fonctionne

### T06 — Google OAuth
**Goal**: Login/Register via Google
**Deliverables**:
- GoogleStrategy (passport-google-oauth20)
- GET /auth/google → redirect Google
- GET /auth/google/callback → set cookies, redirect FRONTEND_URL
- Si email existe déjà → merge avec compte existant
- Verify: flow complet Google → cookie JWT → /auth/me retourne user

### T07 — Tests auth (unit + e2e)
**Goal**: Couvrir les cas critiques d'auth
**Deliverables**:
- auth.service.spec.ts (register, login, refresh)
- test/auth.e2e-spec.ts (register → login → me → refresh → logout)
- Verify: `npm run test && npm run test:e2e` passent

---

## Phase 3 — Backend métier

### T08 — TagsModule (user-scoped)
**Goal**: CRUD tags isolé par utilisateur
**Deliverables**:
- TagsService: create, findAll, delete (filtrés par userId)
- TagsController: POST /tags, GET /tags, DELETE /tags/:id (JwtAuthGuard)
- CreateTagDto + slug auto-généré
- Verify: tags d'un user non visibles par un autre

### T09 — LinksModule CRUD (user-scoped)
**Goal**: CRUD liens isolé par utilisateur
**Deliverables**:
- LinksService: create, findAll (paginé), update, archive, remove
- LinksController: POST /links, GET /links, PATCH /links/:id, PATCH /links/:id/archive, DELETE /links/:id
- Tous les endpoints protégés par JwtAuthGuard
- Toujours filtrer par req.user.id
- Verify: un user ne peut pas accéder aux liens d'un autre

### T10 — Open Graph scraping
**Goal**: Auto-fetch titre + description à la création
**Deliverables**:
- ScraperService (axios + cheerio)
- og:title → fallback <title>, og:description → fallback meta description
- Timeout 5s
- Appelé dans LinksService.create()
- Verify: POST /links avec URL retourne titre scrapé

### T11 — Tag assignment + search + filter
**Goal**: Assigner des tags, filtrer et chercher
**Deliverables**:
- POST /links/:id/tags/:tagId + DELETE /links/:id/tags/:tagId
- GET /links?tag=slug (filtre)
- GET /links?q=term (ILIKE search)
- GET /links?q=term&tag=slug (combiné)
- Tous filtrés par userId
- Verify: search et filter retournent uniquement les liens du user connecté

### T12 — Tests backend (unit + e2e)
**Goal**: Couvrir les endpoints métier
**Deliverables**:
- links.service.spec.ts + tags.service.spec.ts
- test/links.e2e-spec.ts (create, list, filter, search, archive, delete)
- Verify: `npm run test:e2e` passe

---

## Phase 4 — Frontend

### T13 — React init + Tailwind + TanStack Query + axios
**Goal**: Frontend prêt à consommer l'API avec gestion auth
**Deliverables**:
- React + Vite dans /frontend
- Tailwind CSS configuré
- TanStack Query v5 QueryClient
- axios instance avec intercepteur 401 → refresh → retry
- src/api/{client,auth,links,tags}.ts
- Verify: `npm run dev` démarre sans erreur

### T14 — Auth pages (Login + Register + Google)
**Goal**: Pages d'authentification complètes
**Deliverables**:
- LoginPage.tsx (email/password + bouton Google)
- RegisterPage.tsx
- AuthContext.tsx (user courant, login, logout)
- useAuth.ts hook
- Routes protégées (redirect /login si non connecté)
- Bouton Google → window.location vers /auth/google
- Verify: login redirige vers dashboard, logout vide le contexte

### T15 — Dashboard layout + StatCards + LinkCard
**Goal**: Afficher les vrais données de l'API
**Deliverables**:
- Dashboard.tsx avec Sidebar + main
- Sidebar: nav + liste des tags avec compteurs
- StatCard.tsx: total liens, tags, favoris, archivés
- LinkCard.tsx: titre, description, tags, date, actions
- useLinks.ts + useTags.ts hooks TanStack Query
- Verify: dashboard charge les liens du user connecté

### T16 — AddLinkModal
**Goal**: Formulaire d'ajout de lien
**Deliverables**:
- AddLinkModal.tsx: champ URL + description optionnelle
- Preview du titre scrapé pendant le chargement
- On success: ferme modal + invalide query links
- Verify: ajout d'un lien rafraîchit la liste

### T17 — Filtres + recherche + gestion tags
**Goal**: Toutes les interactions utilisateur
**Deliverables**:
- Filtre par tag (pills cliquables dans sidebar)
- Recherche full-text dans TopBar
- Archiver / supprimer un lien depuis LinkCard
- Suppression de tag depuis sidebar
- Verify: filtre + search fonctionnent combinés

---

## Phase 5 — Déploiement

### T18 — Préparer le backend pour Render + Neon
**Goal**: Backend deployable sur Render avec Neon
**Deliverables**:
- Configurer TypeORM pour accepter DATABASE_URL (format Neon)
- Ajouter `ssl: { rejectUnauthorized: false }` pour Neon
- render.yaml (optionnel, pour déploiement automatique)
- Variables d'env documentées dans .env.example
- Verify: build prod `npm run build` → `node dist/main` fonctionne

### T19 — Préparer le frontend pour Vercel
**Goal**: Frontend deployable sur Vercel
**Deliverables**:
- VITE_API_URL utilisé partout (pas de localhost hardcodé)
- vercel.json avec rewrites SPA (handle react-router)
- Verify: `npm run build` sans erreur TypeScript

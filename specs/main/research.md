# Research — LinkVault

*Phase 0 output. All NEEDS CLARIFICATION items resolved.*

---

## 1. Open Graph scraping strategy

**Decision**: `axios` (HTTP client) + `cheerio` (HTML parser)

**Rationale**: Both are already listed in the plan's key dependencies and are the de-facto standard for server-side HTML scraping in Node.js. `cheerio` provides a jQuery-like API; `axios` gives timeout + redirect control. No headless browser needed since OG tags are static.

**Alternatives considered**:
- `node-fetch` + `htmlparser2`: lighter, but cheerio is friendlier for ad-hoc DOM queries
- Puppeteer: overkill for static OG tags, adds ~350 MB to image size
- `metascraper`: opinionated meta-scraping library, but adds hidden dependencies

**Scrape logic**:
1. `GET url` with `timeout: 5000`
2. Look for `<meta property="og:title">` → fallback `<title>`
3. Look for `<meta property="og:description">` → fallback `<meta name="description">`
4. On network error / timeout → return `{ title: null, description: null }` (create link anyway)

---

## 2. Slug generation for tags

**Decision**: `slugify` npm package (already listed as dependency)

**Rationale**: Handles Unicode, diacritics, special chars out-of-the-box; tiny package (< 5 kB); already part of the plan.

**Behavior**: `slugify(name, { lower: true, strict: true })` → removes non-alphanumeric chars, lowercases, replaces spaces with `-`.

**Alternatives considered**:
- Custom regex: error-prone for Unicode
- `limax`: similar, but less popular

---

## 3. Pagination implementation

**Decision**: Offset-based pagination (`page` + fixed `limit = 20`)

**Rationale**: Simple to implement with TypeORM's `findAndCount`. The dataset (personal link collection) is small enough that cursor-based pagination adds no value.

**Response shape**: `{ data: Link[], total: number, page: number }`

**TypeORM**: `skip: (page - 1) * 20, take: 20`

---

## 4. Full-text search

**Decision**: PostgreSQL `ILIKE` on `title` + `description` columns

**Rationale**: Spec explicitly calls for `ILIKE`. The dataset is personal/small; a full-text index (tsvector) is not needed and would complicate migrations.

**TypeORM query**: `createQueryBuilder` with `.orWhere('link.title ILIKE :q').orWhere('link.description ILIKE :q', { q: \`%${term}%\` })`

**Alternatives considered**:
- `pg_trgm` extension: better performance at scale, but requires migration + extension install on Neon
- Elasticsearch: completely out of scope

---

## 5. Refresh token rotation & cookie security

**Decision**: Rotate refresh token on every `/auth/refresh` call; store in `httpOnly; SameSite=Lax` cookie

**Rationale**: Mitigates refresh token theft. The old token is invalidated by overwriting the cookie with a newly signed one. Since we have no token blacklist (no Redis), invalidation is cookie-centric: logout clears the cookie.

**Trade-off**: A stolen refresh token that arrives before the legitimate one will succeed; the legitimate client then gets a 401 and must re-login. Acceptable for this project's threat model.

**Cookie flags**: `httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production'`

---

## 6. Google OAuth account merging

**Decision**: On OAuth callback, look up user by email. If found → return existing user (merge). If not found → create new user with `googleId` set and `password = null`.

**Rationale**: Prevents duplicate accounts. Simple email-based matching is sufficient at this scale.

**Risk**: If a malicious actor controls a Google account with the same email as a local user, they gain access. Mitigated by Google's verified-email guarantee.

---

## 7. Frontend token storage

**Decision**: Access token stored in a module-level JS variable (React context / module variable), never `localStorage` / `sessionStorage`

**Rationale**: `localStorage` is XSS-accessible. Module memory is cleared on tab close (acceptable UX). Spec and CLAUDE.md both mandate this.

**Refresh flow**: Axios request interceptor attaches token. Response interceptor catches 401 → calls `POST /auth/refresh` → updates in-memory token → retries original request once.

---

## 8. Deployment: Neon SSL

**Decision**: TypeORM `extra: { ssl: { rejectUnauthorized: false } }` when `DATABASE_URL` contains `neon.tech`

**Rationale**: Neon requires SSL. `rejectUnauthorized: false` avoids certificate chain issues common with managed DB providers.

**Alternatives considered**:
- Providing the CA cert: more secure, but operationally complex
- Env-flag toggle: `ssl: process.env.NODE_ENV === 'production'`

---

## 9. E2E test strategy

**Decision**: Supertest against a real test PostgreSQL database (separate DB, same schema via migrations)

**Rationale**: CLAUDE.md / feedback memory states no mocking of the database. Integration tests must hit a real DB.

**Setup**: E2E tests use a `test` DATABASE_URL pointing to a local PostgreSQL instance; migrations run before suite; DB truncated between tests.

# Specification — LinkVault

## Feature 1 — Authentication
### Email / Password
- Register: POST /auth/register { email, password, name }
- Login: POST /auth/login { email, password } → sets httpOnly JWT cookies
- Logout: POST /auth/logout → clears cookies
- Refresh: POST /auth/refresh → rotates access token from refresh cookie

### Google OAuth
- Initiate: GET /auth/google → redirects to Google consent screen
- Callback: GET /auth/google/callback → sets JWT cookies, redirects to frontend
- If email already exists as local account → merge (same user)

### JWT strategy
- Access token: 15min, signed with JWT_SECRET
- Refresh token: 7 days, stored in httpOnly cookie
- All routes except /auth/* require valid access token

## Feature 2 — Save a link
**Input**: url (required), description (optional, overrides scraped)
**Behavior**:
- API fetches Open Graph tags (og:title, og:description) from the URL
- Falls back to <title> tag if no OG tags found
- Stored with userId, url, title, description, createdAt, archivedAt (null)
**Validation**: URL must be a valid http/https URL
**Ownership**: link belongs to authenticated user only

## Feature 3 — Tag management
**Entity**: Tag { id, name, slug, userId, createdAt }
**Behavior**:
- Create a tag (name auto-slugified, scoped to user)
- Delete a tag (removes associations, not the links)
- Assign / remove tags on a link (many-to-many, within same user)
- A link can have 0 to N tags

## Feature 4 — List & filter
**Endpoint**: GET /links
**Behavior**:
- Returns only the authenticated user's non-archived links
- Paginated: 20 items per page, page param
- Filter by tag slug: ?tag=nestjs
- Sort: createdAt DESC (fixed)
**Response**: { data: Link[], total: number, page: number }

## Feature 5 — Full-text search
**Endpoint**: GET /links?q=searchterm
**Behavior**:
- PostgreSQL ILIKE search on title + description
- Combinable with tag filter: ?q=react&tag=frontend
- Scoped to authenticated user only

## Feature 6 — Archive / delete
- Soft delete: PATCH /links/:id/archive → sets archivedAt = now()
- Hard delete: DELETE /links/:id → removes from DB permanently
- Archived links excluded from list/search by default
- Only owner can archive/delete their own links

## Data model

### User
| Field       | Type      | Notes                        |
|-------------|-----------|------------------------------|
| id          | uuid      | primary key                  |
| email       | varchar   | unique                       |
| name        | varchar   |                              |
| password    | varchar   | nullable (Google users)      |
| googleId    | varchar   | nullable (local users)       |
| createdAt   | timestamp | auto                         |

### Link
| Field       | Type      | Notes                        |
|-------------|-----------|------------------------------|
| id          | uuid      | primary key                  |
| url         | varchar   |                              |
| title       | varchar   | scraped or user-provided     |
| description | text      | nullable                     |
| userId      | uuid      | FK → User (mandatory)        |
| createdAt   | timestamp | auto                         |
| archivedAt  | timestamp | nullable, soft delete        |
| tags        | Tag[]     | many-to-many (user-scoped)   |

### Tag
| Field     | Type      | Notes                        |
|-----------|-----------|------------------------------|
| id        | uuid      | primary key                  |
| name      | varchar   |                              |
| slug      | varchar   |                              |
| userId    | uuid      | FK → User (mandatory)        |
| createdAt | timestamp | auto                         |
| Unique constraint: (slug, userId)    |           |

## REST API

| Method | Endpoint                    | Auth | Description               |
|--------|-----------------------------|------|---------------------------|
| POST   | /auth/register              | ❌   | Créer un compte           |
| POST   | /auth/login                 | ❌   | Se connecter              |
| POST   | /auth/logout                | ✅   | Se déconnecter            |
| POST   | /auth/refresh               | ❌   | Rafraîchir le token       |
| GET    | /auth/google                | ❌   | OAuth Google              |
| GET    | /auth/google/callback       | ❌   | Callback OAuth            |
| GET    | /auth/me                    | ✅   | Profil utilisateur        |
| POST   | /links                      | ✅   | Créer + scrape OG         |
| GET    | /links?page&q&tag           | ✅   | Lister / filtrer          |
| PATCH  | /links/:id                  | ✅   | Modifier                  |
| PATCH  | /links/:id/archive          | ✅   | Archiver                  |
| DELETE | /links/:id                  | ✅   | Supprimer                 |
| POST   | /links/:id/tags/:tagId      | ✅   | Assigner un tag           |
| DELETE | /links/:id/tags/:tagId      | ✅   | Retirer un tag            |
| GET    | /tags                       | ✅   | Lister ses tags           |
| POST   | /tags                       | ✅   | Créer un tag              |
| DELETE | /tags/:id                   | ✅   | Supprimer un tag          |

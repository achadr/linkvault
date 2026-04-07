# API Contracts — LinkVault

*Phase 1 output. All endpoints served by the NestJS backend on port 3000.*

Base URL (local): `http://localhost:3000`

---

## Auth endpoints (no JWT required unless noted)

### POST /auth/register

**Request**
```json
{ "email": "user@example.com", "password": "secret123", "name": "Alice" }
```

**Response 201**
```json
{ "accessToken": "<jwt>" }
```
Also sets `refresh_token` httpOnly cookie (7 days).

**Errors**: 409 if email already taken.

---

### POST /auth/login

**Request**
```json
{ "email": "user@example.com", "password": "secret123" }
```

**Response 200**
```json
{ "accessToken": "<jwt>" }
```
Also sets `refresh_token` httpOnly cookie (7 days).

**Errors**: 401 if credentials invalid.

---

### POST /auth/refresh

Reads `refresh_token` cookie automatically.

**Response 200**
```json
{ "accessToken": "<new-jwt>" }
```
Rotates cookie with new refresh token.

**Errors**: 401 if cookie missing or invalid.

---

### POST /auth/logout *(JWT required)*

Clears `refresh_token` cookie and access token cookie (if any).

**Response 200** `{}`

---

### GET /auth/me *(JWT required)*

**Response 200**
```json
{ "id": "uuid", "email": "user@example.com", "name": "Alice", "createdAt": "ISO8601" }
```

---

### GET /auth/google

Redirects browser to Google OAuth consent screen.

---

### GET /auth/google/callback

Google redirects here after consent. Backend sets cookie and redirects to:
```
{FRONTEND_URL}?accessToken=<jwt>
```

---

## Links endpoints *(all require JWT)*

### POST /links

**Request**
```json
{ "url": "https://example.com", "description": "optional override" }
```

**Response 201**
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "optional override or scraped",
  "userId": "uuid",
  "createdAt": "ISO8601",
  "archivedAt": null,
  "tags": []
}
```

---

### GET /links

**Query params**:
- `page` (default 1)
- `q` — full-text search (ILIKE on title + description)
- `tag` — slug filter
- `archived=true` — return archived links instead of active

**Response 200**
```json
{
  "data": [ /* Link[] */ ],
  "total": 42,
  "page": 1
}
```

---

### PATCH /links/:id

**Request** (all fields optional)
```json
{ "url": "https://new.com", "title": "override", "description": "override" }
```

If `url` changes, OG tags are re-scraped (explicit `title`/`description` override the scraped values).

**Response 200** → updated Link object.

**Errors**: 403 if not owner; 404 if not found.

---

### PATCH /links/:id/archive

No body.

**Response 200** → Link with `archivedAt` set to now.

**Errors**: 403 if not owner; 404 if not found.

---

### DELETE /links/:id

Hard delete.

**Response 204** no body.

**Errors**: 403 if not owner; 404 if not found.

---

### POST /links/:id/tags/:tagId

Assigns an existing tag to a link (both owned by current user).

**Response 200** → updated Link with tags array.

**Errors**: 403 if link or tag not owned by user; 404 if either not found.

---

### DELETE /links/:id/tags/:tagId

Removes a tag from a link.

**Response 200** → updated Link with tags array.

**Errors**: 403/404 same as above.

---

## Tags endpoints *(all require JWT)*

### GET /tags

**Response 200**
```json
[
  { "id": "uuid", "name": "NestJS", "slug": "nestjs", "userId": "uuid", "createdAt": "ISO8601" }
]
```

---

### POST /tags

**Request**
```json
{ "name": "NestJS" }
```

Slug is auto-generated: `slugify("NestJS") → "nestjs"`.

**Response 201** → Tag object.

**Errors**: 409 if slug already exists for this user.

---

### DELETE /tags/:id

Removes tag and all its associations (join table rows). Links are not deleted.

**Response 204** no body.

**Errors**: 403 if not owner; 404 if not found.

---

## Error response shape

```json
{
  "statusCode": 400,
  "message": "url must be a URL address",
  "error": "Bad Request"
}
```

NestJS built-in exception format. Validation errors include an array of messages.

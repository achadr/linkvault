# Data Model — LinkVault

*Phase 1 output.*

---

## Entities

### User

| Column      | PG Type                | Constraints                  | Notes                          |
|-------------|------------------------|------------------------------|--------------------------------|
| id          | uuid                   | PRIMARY KEY, DEFAULT gen_random_uuid() | TypeORM `@PrimaryGeneratedColumn('uuid')` |
| email       | varchar(255)           | UNIQUE NOT NULL              |                                |
| name        | varchar(255)           | NOT NULL                     |                                |
| password    | varchar(255)           | NULL                         | NULL for Google-only accounts  |
| googleId    | varchar(255)           | NULL                         | NULL for local accounts        |
| createdAt   | timestamp with time zone | NOT NULL DEFAULT now()     | TypeORM `@CreateDateColumn`    |

**Indexes**: UNIQUE on `email`

---

### Link

| Column      | PG Type                | Constraints                  | Notes                                  |
|-------------|------------------------|------------------------------|----------------------------------------|
| id          | uuid                   | PRIMARY KEY                  |                                        |
| url         | varchar(2048)          | NOT NULL                     | http/https validated at DTO layer      |
| title       | varchar(500)           | NULL                         | Scraped or user-provided               |
| description | text                   | NULL                         | Scraped or user-provided               |
| userId      | uuid                   | NOT NULL, FK → user(id)      | ON DELETE CASCADE                      |
| createdAt   | timestamp with time zone | NOT NULL DEFAULT now()     |                                        |
| archivedAt  | timestamp with time zone | NULL                       | NULL = active; set = soft-deleted      |

**Indexes**: `(userId, createdAt DESC)` for list queries; `(userId, archivedAt)` for archive filter

**Many-to-many**: `link_tags` join table → `linkId` (FK link.id) + `tagId` (FK tag.id)

---

### Tag

| Column    | PG Type                | Constraints                        | Notes                       |
|-----------|------------------------|------------------------------------|-----------------------------|
| id        | uuid                   | PRIMARY KEY                        |                             |
| name      | varchar(100)           | NOT NULL                           | Display name                |
| slug      | varchar(100)           | NOT NULL                           | Auto-generated via slugify  |
| userId    | uuid                   | NOT NULL, FK → user(id)            | ON DELETE CASCADE           |
| createdAt | timestamp with time zone | NOT NULL DEFAULT now()           |                             |

**Indexes**: UNIQUE on `(slug, userId)`

---

## Relationships

```
User (1) ──< Link (N)       via link.userId
User (1) ──< Tag  (N)       via tag.userId
Link (M) >──< Tag (N)       via link_tags join table
```

**User-scoping rule**: Every query on Link or Tag must include `WHERE userId = :currentUserId`. Services enforce this; controllers must never pass a raw user-supplied ID for the owner filter.

---

## Validation rules (enforced at DTO layer)

| Field        | Rule                                                     |
|--------------|----------------------------------------------------------|
| email        | `@IsEmail()`                                             |
| password     | `@MinLength(8)`                                          |
| url (create) | `@IsUrl({ protocols: ['http','https'] })`                |
| url (update) | Same, but `@IsOptional()`                                |
| tag.name     | `@IsString() @MaxLength(100) @MinLength(1)`              |
| page         | `@IsOptional() @IsInt() @Min(1)` (query param)           |

---

## State transitions

### Link lifecycle

```
[active]  archivedAt = NULL
   │
   │ PATCH /links/:id/archive
   ▼
[archived]  archivedAt = timestamp
   │
   │ DELETE /links/:id
   ▼
[deleted]  row removed from DB
```

Active links are returned by default (`WHERE archivedAt IS NULL`).
Archived links returned when `?archived=true` (`WHERE archivedAt IS NOT NULL`).

---

## Migration

**File**: `backend/src/migrations/1711900000000-InitSchema.ts`
Creates tables: `user`, `link`, `tag`, `link_tags` with all constraints and indexes listed above.

Run via: `npm run migration:run` (TypeORM CLI, never `synchronize: true`).

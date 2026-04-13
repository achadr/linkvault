import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { ScraperService } from '../src/modules/links/scraper.service';

// Use a deterministic URL that won't hit the real network
const TEST_URL = 'https://example.com';

describe('Links (e2e)', () => {
  let app: INestApplication;

  const userA = {
    email: `e2e-links-a-${Date.now()}@example.com`,
    password: 'Password123',
    name: 'User A',
  };
  const userB = {
    email: `e2e-links-b-${Date.now()}@example.com`,
    password: 'Password123',
    name: 'User B',
  };

  let tokenA: string;
  let tokenB: string;
  let linkId: string;
  let tagId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ScraperService)
      .useValue({ scrape: () => Promise.resolve({ title: 'Scraped Title', description: 'Scraped Desc' }) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Register both users and grab their tokens
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer()).post('/auth/register').send(userA),
      request(app.getHttpServer()).post('/auth/register').send(userB),
    ]);

    tokenA = resA.body.accessToken;
    tokenB = resB.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Auth guard ─────────────────────────────────────────────────────────

  it('GET /links → 401 without token', () => {
    return request(app.getHttpServer()).get('/links').expect(401);
  });

  it('POST /links → 401 without token', () => {
    return request(app.getHttpServer())
      .post('/links')
      .send({ url: TEST_URL })
      .expect(401);
  });

  // ─── Validation ─────────────────────────────────────────────────────────

  it('POST /links → 400 for invalid URL', () => {
    return request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'not-a-url' })
      .expect(400);
  });

  it('POST /links → 400 for missing url', () => {
    return request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({})
      .expect(400);
  });

  // ─── Create ─────────────────────────────────────────────────────────────

  it('POST /links → 201 with scraped title and correct shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: TEST_URL })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.url).toBe(TEST_URL);
    expect(res.body.title).toBe('Scraped Title');
    expect(res.body.description).toBe('Scraped Desc');
    expect(res.body.archivedAt).toBeNull();
    expect(res.body.tags).toEqual([]);

    linkId = res.body.id;
  });

  it('POST /links → explicit description overrides scraped', async () => {
    const res = await request(app.getHttpServer())
      .post('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: TEST_URL, description: 'My desc' })
      .expect(201);

    expect(res.body.description).toBe('My desc');
  });

  // ─── List ────────────────────────────────────────────────────────────────

  it('GET /links → 200 with pagination shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /links → only returns own links (user B sees 0)', async () => {
    const res = await request(app.getHttpServer())
      .get('/links')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(res.body.total).toBe(0);
    expect(res.body.data).toHaveLength(0);
  });

  it('GET /links?q=Scraped → returns matching links', async () => {
    const res = await request(app.getHttpServer())
      .get('/links?q=Scraped')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].title).toContain('Scraped');
  });

  it('GET /links?q=nomatch → returns empty list', async () => {
    const res = await request(app.getHttpServer())
      .get('/links?q=xyzzy-no-match-12345')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('GET /links?archived=true → returns 0 before any archive', async () => {
    const res = await request(app.getHttpServer())
      .get('/links?archived=true')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  // ─── Update ─────────────────────────────────────────────────────────────

  it('PATCH /links/:id → 200 updates title', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/links/${linkId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Updated Title' })
      .expect(200);

    expect(res.body.title).toBe('Updated Title');
  });

  it('PATCH /links/:id → 400 for invalid URL in body', () => {
    return request(app.getHttpServer())
      .patch(`/links/${linkId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'not-a-url' })
      .expect(400);
  });

  it('PATCH /links/:id → 403 when user B tries to update user A link', () => {
    return request(app.getHttpServer())
      .patch(`/links/${linkId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Hacked' })
      .expect(403);
  });

  it('PATCH /links/:id → 404 for unknown id', () => {
    return request(app.getHttpServer())
      .patch('/links/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'x' })
      .expect(404);
  });

  // ─── Tag assignment ──────────────────────────────────────────────────────

  it('POST /tags → 201 creates a tag for user A', async () => {
    const res = await request(app.getHttpServer())
      .post('/tags')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'NestJS' })
      .expect(201);

    expect(res.body.slug).toBe('nestjs');
    tagId = res.body.id;
  });

  it('POST /links/:id/tags/:tagId → 200 assigns tag to link', async () => {
    const res = await request(app.getHttpServer())
      .post(`/links/${linkId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.tags).toHaveLength(1);
    expect(res.body.tags[0].id).toBe(tagId);
  });

  it('POST /links/:id/tags/:tagId → idempotent (assign same tag twice)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/links/${linkId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.tags).toHaveLength(1);
  });

  it('GET /links?tag=nestjs → returns only tagged links', async () => {
    const res = await request(app.getHttpServer())
      .get('/links?tag=nestjs')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThan(0);
    const link = res.body.data.find((l: { id: string }) => l.id === linkId);
    expect(link).toBeDefined();
  });

  it('GET /links?tag=nonexistent → returns empty list', async () => {
    const res = await request(app.getHttpServer())
      .get('/links?tag=nonexistent-slug')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('POST /links/:id/tags/:tagId → 403 when user B tries to assign tag on user A link', () => {
    return request(app.getHttpServer())
      .post(`/links/${linkId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('DELETE /links/:id/tags/:tagId → 200 removes tag from link', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/links/${linkId}/tags/${tagId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.tags).toHaveLength(0);
  });

  // ─── Archive ─────────────────────────────────────────────────────────────

  it('PATCH /links/:id/archive → 403 when user B tries to archive user A link', () => {
    return request(app.getHttpServer())
      .patch(`/links/${linkId}/archive`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('PATCH /links/:id/archive → 200 sets archivedAt', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/links/${linkId}/archive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(res.body.archivedAt).not.toBeNull();
  });

  it('GET /links → archived link no longer appears in active list', async () => {
    const res = await request(app.getHttpServer())
      .get('/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const found = res.body.data.find((l: { id: string }) => l.id === linkId);
    expect(found).toBeUndefined();
  });

  it('GET /links?archived=true → archived link appears', async () => {
    const res = await request(app.getHttpServer())
      .get('/links?archived=true')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const found = res.body.data.find((l: { id: string }) => l.id === linkId);
    expect(found).toBeDefined();
  });

  // ─── Delete ──────────────────────────────────────────────────────────────

  it('DELETE /links/:id → 403 when user B tries to delete user A link', () => {
    return request(app.getHttpServer())
      .delete(`/links/${linkId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('DELETE /links/:id → 204 hard-deletes the link', () => {
    return request(app.getHttpServer())
      .delete(`/links/${linkId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);
  });

  it('DELETE /links/:id → 404 after deletion', () => {
    return request(app.getHttpServer())
      .delete(`/links/${linkId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });
});

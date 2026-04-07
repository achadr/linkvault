import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  // Unique email per run so tests don't collide with existing data
  const testEmail = `e2e-auth-${Date.now()}@example.com`;
  const testPassword = 'Password123';

  let accessToken: string;
  let refreshCookieHeader: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register → 201 with accessToken in body and refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'E2E User' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user).not.toHaveProperty('password');

    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    refreshCookieHeader = cookies.find((c) => c.startsWith('refresh_token')) ?? '';
    expect(refreshCookieHeader).toBeTruthy();

    accessToken = res.body.accessToken;
  });

  it('POST /auth/register → 409 on duplicate email', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'Dup' })
      .expect(409);
  });

  it('POST /auth/login → 200 with accessToken in body and refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'] as unknown as string[];
    refreshCookieHeader = cookies.find((c) => c.startsWith('refresh_token')) ?? '';
    expect(refreshCookieHeader).toBeTruthy();

    accessToken = res.body.accessToken;
  });

  it('POST /auth/login → 401 for wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrongpass' })
      .expect(401);
  });

  it('GET /auth/me → 200 returns current user via Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(testEmail);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('googleId');
  });

  it('GET /auth/me → 401 without token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('POST /auth/refresh → 200 returns new accessToken and rotates refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [refreshCookieHeader])
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);

    const newCookies = res.headers['set-cookie'] as unknown as string[];
    expect(newCookies.some((c) => c.startsWith('refresh_token'))).toBe(true);

    accessToken = res.body.accessToken;
  });

  it('POST /auth/logout → 204 clears refresh_token cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const cleared = res.headers['set-cookie'] as unknown as string[];
    expect(cleared.some((c) => c.includes('refresh_token=;'))).toBe(true);
  });
});

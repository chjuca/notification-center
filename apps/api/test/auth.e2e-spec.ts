import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, Like } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/users/user.entity.js';

const EMAIL_PREFIX = 'e2e-auth-';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const uniqueEmail = () =>
    `${EMAIL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource
      .getRepository(User)
      .delete({ email: Like(`${EMAIL_PREFIX}%`) });
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates the account and returns it without the password', async () => {
      const email = uniqueEmail();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'correct-horse' })
        .expect(201);

      expect(response.body).toEqual({ id: expect.any(String), email });
    });

    it('stores an argon2id hash instead of the password', async () => {
      const email = uniqueEmail();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'correct-horse' })
        .expect(201);

      const stored = await dataSource.getRepository(User).findOne({
        where: { email },
        select: { id: true, passwordHash: true },
      });

      expect(stored?.passwordHash.startsWith('$argon2id$')).toBe(true);
    });

    it('rejects an email that is already registered', async () => {
      const email = uniqueEmail();
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'correct-horse' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: email.toUpperCase(), password: 'another-password' })
        .expect(409);
    });

    it('rejects an invalid email and a short password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(response.body.message).toHaveLength(2);
    });
  });

  describe('POST /auth/login', () => {
    const password = 'correct-horse';
    let email: string;
    let userId: string;

    beforeAll(async () => {
      email = uniqueEmail();
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);
      userId = response.body.id;
    });

    it('returns a signed token for the right credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: expect.any(Number),
      });

      const payload = await app
        .get(JwtService)
        .verifyAsync<{ sub: string; exp: number; iat: number }>(
          response.body.accessToken,
        );
      expect(payload.sub).toBe(userId);
      expect(payload.exp - payload.iat).toBe(response.body.expiresIn);
    });

    it('answers the same 401 for a wrong password and an unknown email', async () => {
      const wrongPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);

      const unknownEmail = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: uniqueEmail(), password })
        .expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });
  });
});

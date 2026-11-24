import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, Like } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/users/user.entity.js';

const EMAIL_PREFIX = 'e2e-notifications-';
const PASSWORD = 'correct-horse';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let anaToken: string;
  let benToken: string;
  let benId: string;

  const registerAndLogin = async () => {
    const email = `${EMAIL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return {
      id: registered.body.id as string,
      token: login.body.accessToken as string,
    };
  };

  const createNotification = (token: string, overrides: object = {}) =>
    request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Welcome',
        content: 'Hello there',
        channel: 'email',
        recipient: 'someone@example.com',
        ...overrides,
      });

  const listNotifications = (token: string, query = '') =>
    request(app.getHttpServer())
      .get(`/notifications${query}`)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const [ana, ben] = [await registerAndLogin(), await registerAndLogin()];
    anaToken = ana.token;
    benToken = ben.token;
    benId = ben.id;
  });

  afterAll(async () => {
    await dataSource
      .getRepository(User)
      .delete({ email: Like(`${EMAIL_PREFIX}%`) });
    await app.close();
  });

  describe('POST /notifications', () => {
    it('creates a notification and returns it', async () => {
      const response = await createNotification(anaToken, {
        title: '  First  ',
      }).expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        title: 'First',
        content: 'Hello there',
        channel: 'email',
        recipient: 'someone@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('ignores an owner sent in the body: the owner is the token', async () => {
      await createNotification(anaToken, {
        title: 'Second',
        userId: benId,
      }).expect(201);

      const benList = await listNotifications(benToken).expect(200);

      expect(benList.body.total).toBe(0);
    });

    it('rejects a body with missing or empty fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${anaToken}`)
        .send({ title: '   ', channel: 'email' })
        .expect(400);

      expect(response.body.message).toHaveLength(3);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .send({})
        .expect(401);
    });
  });

  describe('GET /notifications', () => {
    it('returns only the notifications of the caller, newest first', async () => {
      await createNotification(anaToken, { title: 'Third' }).expect(201);
      await createNotification(benToken, { title: 'From Ben' }).expect(201);

      const anaList = await listNotifications(anaToken).expect(200);
      const benList = await listNotifications(benToken).expect(200);

      expect(
        anaList.body.items.map((item: { title: string }) => item.title),
      ).toEqual(['Third', 'Second', 'First']);
      expect(anaList.body).toMatchObject({ total: 3, page: 1, limit: 20 });
      expect(
        benList.body.items.map((item: { title: string }) => item.title),
      ).toEqual(['From Ben']);
    });

    it('paginates', async () => {
      const response = await listNotifications(
        anaToken,
        '?page=2&limit=2',
      ).expect(200);

      expect(
        response.body.items.map((item: { title: string }) => item.title),
      ).toEqual(['First']);
      expect(response.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    });

    it('rejects a page size over the maximum', async () => {
      await listNotifications(anaToken, '?limit=101').expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });
});

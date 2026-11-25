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
        deliveries: [
          {
            id: expect.any(String),
            channel: 'email',
            recipient: 'someone@example.com',
            status: 'sent',
            details: {
              subject: 'First',
              html: expect.stringContaining('<h1>First</h1>'),
            },
            error: null,
            createdAt: expect.any(String),
          },
        ],
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

  describe('POST /notifications: sending through each channel', () => {
    let carlaToken: string;

    beforeAll(async () => {
      carlaToken = (await registerAndLogin()).token;
    });

    const totalOf = async (token: string) =>
      (await listNotifications(token).expect(200)).body.total as number;

    it('cuts an sms to 160 characters and records what was sent', async () => {
      const response = await createNotification(carlaToken, {
        title: 'Code',
        content: 'x'.repeat(300),
        channel: 'sms',
        recipient: '+56912345678',
      }).expect(201);

      expect(response.body.content).toHaveLength(300);
      expect(response.body.deliveries[0]).toMatchObject({
        channel: 'sms',
        recipient: '+56912345678',
        status: 'sent',
        details: {
          to: '+56912345678',
          text: `Code: ${'x'.repeat(154)}`,
          truncated: true,
          originalLength: 306,
        },
      });
    });

    it('formats the payload of a push notification', async () => {
      const deviceToken =
        'dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx_abc';

      const response = await createNotification(carlaToken, {
        title: 'New message',
        content: 'You have one new message',
        channel: 'push',
        recipient: deviceToken,
      }).expect(201);

      expect(response.body.deliveries[0]).toMatchObject({
        channel: 'push',
        status: 'sent',
        details: {
          payload: {
            token: deviceToken,
            notification: {
              title: 'New message',
              body: 'You have one new message',
            },
          },
        },
      });
    });

    it('rejects an unknown channel, naming the available ones, and saves nothing', async () => {
      const before = await totalOf(carlaToken);

      const response = await createNotification(carlaToken, {
        channel: 'fax',
      }).expect(400);

      expect(response.body.message).toEqual([
        'channel must be one of: email, sms, push',
      ]);
      expect(await totalOf(carlaToken)).toBe(before);
    });

    it.each([
      ['email', 'not-an-email'],
      ['sms', 'someone@example.com'],
      ['push', 'too-short'],
    ])(
      'rejects a recipient the %s channel does not accept and saves nothing',
      async (channel, recipient) => {
        const before = await totalOf(carlaToken);

        await createNotification(carlaToken, { channel, recipient }).expect(
          400,
        );

        expect(await totalOf(carlaToken)).toBe(before);
      },
    );
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

    it('includes the deliveries of each notification', async () => {
      const response = await listNotifications(anaToken).expect(200);

      for (const item of response.body.items) {
        expect(item.deliveries).toHaveLength(1);
        expect(item.deliveries[0].status).toBe('sent');
      }
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

  describe('PATCH /notifications/:id', () => {
    const patch = (token: string, id: string, body: object) =>
      request(app.getHttpServer())
        .patch(`/notifications/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    it('changes only the fields that were sent', async () => {
      const created = await createNotification(anaToken, {
        title: 'Before',
      }).expect(201);

      const response = await patch(anaToken, created.body.id, {
        title: 'After',
      }).expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        title: 'After',
        content: created.body.content,
        channel: created.body.channel,
        recipient: created.body.recipient,
        createdAt: created.body.createdAt,
      });
      expect(response.body.updatedAt).not.toBe(created.body.updatedAt);
    });

    it('answers 404 for a notification of another user and leaves it intact', async () => {
      const created = await createNotification(anaToken, {
        title: 'Owned by Ana',
      }).expect(201);

      await patch(benToken, created.body.id, { title: 'Hijacked' }).expect(404);

      const anaList = await listNotifications(anaToken).expect(200);
      const titles = anaList.body.items.map(
        (item: { title: string }) => item.title,
      );
      expect(titles).toContain('Owned by Ana');
      expect(titles).not.toContain('Hijacked');
    });

    it('rejects a change that leaves the recipient invalid for the channel', async () => {
      const created = await createNotification(anaToken).expect(201);

      const response = await patch(anaToken, created.body.id, {
        channel: 'sms',
      }).expect(400);

      expect(response.body.message).toHaveLength(1);
    });

    it('accepts a change of channel with a matching recipient, without sending again', async () => {
      const created = await createNotification(anaToken).expect(201);

      const response = await patch(anaToken, created.body.id, {
        channel: 'sms',
        recipient: '+56912345678',
      }).expect(200);

      expect(response.body).toMatchObject({
        channel: 'sms',
        recipient: '+56912345678',
      });
      expect(response.body.deliveries).toEqual(created.body.deliveries);
    });

    it('answers 404 for an id that does not exist', async () => {
      await patch(anaToken, '7b0f4c1e-3d55-4a51-9a51-1f0c3f1e2a10', {
        title: 'Nope',
      }).expect(404);
    });

    it('rejects an id that is not a uuid and an empty body', async () => {
      const created = await createNotification(anaToken).expect(201);

      await patch(anaToken, 'not-a-uuid', { title: 'Nope' }).expect(400);
      await patch(anaToken, created.body.id, {}).expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .patch('/notifications/7b0f4c1e-3d55-4a51-9a51-1f0c3f1e2a10')
        .send({ title: 'Nope' })
        .expect(401);
    });
  });

  describe('DELETE /notifications/:id', () => {
    const remove = (token: string, id: string) =>
      request(app.getHttpServer())
        .delete(`/notifications/${id}`)
        .set('Authorization', `Bearer ${token}`);

    const idsOf = async (token: string) => {
      const list = await listNotifications(token, '?limit=100').expect(200);
      return list.body.items.map((item: { id: string }) => item.id);
    };

    it('deletes a notification of the caller', async () => {
      const created = await createNotification(anaToken).expect(201);

      const response = await remove(anaToken, created.body.id).expect(204);

      expect(response.body).toEqual({});
      expect(await idsOf(anaToken)).not.toContain(created.body.id);
    });

    it('answers 404 for a notification of another user and keeps it', async () => {
      const created = await createNotification(anaToken).expect(201);

      await remove(benToken, created.body.id).expect(404);

      expect(await idsOf(anaToken)).toContain(created.body.id);
    });

    it('answers 404 the second time', async () => {
      const created = await createNotification(anaToken).expect(201);
      await remove(anaToken, created.body.id).expect(204);

      await remove(anaToken, created.body.id).expect(404);
    });

    it('rejects an id that is not a uuid', async () => {
      await remove(anaToken, 'not-a-uuid').expect(400);
    });

    it('requires a token', async () => {
      await request(app.getHttpServer())
        .delete('/notifications/7b0f4c1e-3d55-4a51-9a51-1f0c3f1e2a10')
        .expect(401);
    });
  });
});

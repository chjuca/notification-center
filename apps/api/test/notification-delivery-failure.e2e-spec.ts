import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, Like } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { withoutThrottling } from './support/without-throttling.js';
import { EmailChannel } from '../src/notifications/channels/email.channel.js';
import type { NotificationChannel } from '../src/notifications/channels/notification-channel.js';
import { User } from '../src/users/user.entity.js';

const EMAIL_PREFIX = 'e2e-delivery-failure-';

const brokenEmailChannel: NotificationChannel = {
  name: 'email',
  validate: () => [],
  send: () => Promise.reject(new Error('provider down')),
};

describe('Delivery failure (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await withoutThrottling(
      Test.createTestingModule({
        imports: [AppModule],
      }),
    )
      .overrideProvider(EmailChannel)
      .useValue(brokenEmailChannel)
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const credentials = {
      email: `${EMAIL_PREFIX}${Date.now()}@example.com`,
      password: 'correct-horse',
    };
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await dataSource
      .getRepository(User)
      .delete({ email: Like(`${EMAIL_PREFIX}%`) });
    await app.close();
  });

  it('creates the notification and records the delivery as failed', async () => {
    const created = await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Welcome',
        content: 'Hello there',
        channel: 'email',
        recipient: 'someone@example.com',
      })
      .expect(201);

    expect(created.body.deliveries).toEqual([
      {
        id: expect.any(String),
        channel: 'email',
        recipient: 'someone@example.com',
        status: 'failed',
        details: {},
        error: 'provider down',
        createdAt: expect.any(String),
      },
    ]);

    const list = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(list.body.total).toBe(1);
    expect(list.body.items[0].deliveries[0].status).toBe('failed');
  });
});

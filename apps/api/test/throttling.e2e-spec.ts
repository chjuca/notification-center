import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource, Like } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { AUTH_THROTTLE } from '../src/common/throttle.js';
import { User } from '../src/users/user.entity.js';

const EMAIL_PREFIX = 'e2e-throttling-';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const credentials = {
    email: `${EMAIL_PREFIX}${Date.now()}@example.com`,
    password: 'correct-horse',
  };

  const login = (password = credentials.password) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...credentials, password });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
  });

  afterAll(async () => {
    await dataSource
      .getRepository(User)
      .delete({ email: Like(`${EMAIL_PREFIX}%`) });
    await app.close();
  });

  it('blocks login after the allowed attempts, even with the right password', async () => {
    const first = await login().expect(200);
    const token = first.body.accessToken as string;
    expect(first.headers['x-ratelimit-limit']).toBe(
      String(AUTH_THROTTLE.limit),
    );

    for (let attempt = 2; attempt <= AUTH_THROTTLE.limit; attempt++) {
      await login('wrong-password').expect(401);
    }

    const blocked = await login().expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);

    for (let call = 0; call <= AUTH_THROTTLE.limit; call++) {
      await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }
  });
});

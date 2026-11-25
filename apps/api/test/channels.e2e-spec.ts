import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { withoutThrottling } from './support/without-throttling.js';

describe('Channels (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await withoutThrottling(
      Test.createTestingModule({ imports: [AppModule] }),
    ).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    token = await app
      .get(JwtService)
      .signAsync({ sub: '7b0f4c1e-3d55-4a51-9a51-1f0c3f1e2a10' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the registered channels', async () => {
    const response = await request(app.getHttpServer())
      .get('/channels')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual([
      { name: 'email' },
      { name: 'sms' },
      { name: 'push' },
    ]);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer()).get('/channels').expect(401);
  });
});

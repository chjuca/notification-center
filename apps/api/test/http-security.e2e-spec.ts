import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { withoutThrottling } from './support/without-throttling.js';

const ALLOWED_ORIGIN = 'http://localhost:3000';

describe('HTTP security (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await withoutThrottling(
      Test.createTestingModule({ imports: [AppModule] }),
    ).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('security headers', () => {
    it('are sent on every response, errors included', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .expect(401);

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'referrer-policy': 'no-referrer',
        'strict-transport-security': expect.stringContaining('max-age='),
        'content-security-policy':
          expect.stringContaining("default-src 'self'"),
      });
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS', () => {
    const preflight = (origin: string, method: string) =>
      request(app.getHttpServer())
        .options('/notifications')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', method)
        .set('Access-Control-Request-Headers', 'authorization,content-type');

    it('lets the configured origin use every method of the api with a token', async () => {
      const response = await preflight(ALLOWED_ORIGIN, 'PATCH').expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        ALLOWED_ORIGIN,
      );
      expect(response.headers['access-control-allow-methods']).toBe(
        'GET,POST,PATCH,DELETE',
      );
      expect(response.headers['access-control-allow-headers']).toBe(
        'Content-Type,Authorization',
      );
    });

    it('does not authorize any other origin', async () => {
      const response = await preflight('https://evil.example.com', 'PATCH');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('never allows credentials such as cookies', async () => {
      const response = await preflight(ALLOWED_ORIGIN, 'POST');

      expect(
        response.headers['access-control-allow-credentials'],
      ).toBeUndefined();
    });
  });
});

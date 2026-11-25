import { createRequire } from 'node:module';
import { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { withoutThrottling } from './support/without-throttling.js';
import { scriptSources } from '../src/configure-app.js';
import {
  createOpenApiDocument,
  setupSwagger,
  SWAGGER_CDN_ORIGIN,
  SWAGGER_PATH,
  SWAGGER_UI_VERSION,
} from '../src/swagger.js';

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const moduleRef = await withoutThrottling(
      Test.createTestingModule({
        imports: [AppModule],
      }),
    ).compile();
    app = moduleRef.createNestApplication();
    setupSwagger(app);
    await app.init();
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the interface and the document without a token', async () => {
    await request(app.getHttpServer()).get(`/${SWAGGER_PATH}`).expect(200);

    const response = await request(app.getHttpServer())
      .get(`/${SWAGGER_PATH}-json`)
      .expect(200);

    expect(response.body.info.title).toBe('Notification Center API');
  });

  it('can load its interface from a cdn, pinned to the installed version', async () => {
    const moduleRef = await withoutThrottling(
      Test.createTestingModule({ imports: [AppModule] }),
    ).compile();
    const cdnApp = moduleRef.createNestApplication<INestApplication<App>>();
    setupSwagger(cdnApp, 'cdn');
    await cdnApp.init();

    const response = await request(cdnApp.getHttpServer())
      .get(`/${SWAGGER_PATH}`)
      .expect(200);
    await cdnApp.close();

    const cdn = `${SWAGGER_CDN_ORIGIN}/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;
    expect(response.text).toContain(`${cdn}/swagger-ui.css`);
    expect(response.text).toContain(`${cdn}/swagger-ui-bundle.js`);
    expect(response.text).toContain(`${cdn}/swagger-ui-standalone-preset.js`);

    const swaggerRequire = createRequire(
      createRequire(import.meta.url).resolve('@nestjs/swagger/package.json'),
    );
    const installed = swaggerRequire('swagger-ui-dist/package.json') as {
      version: string;
    };
    expect(SWAGGER_UI_VERSION).toBe(installed.version);
  });

  it('allows scripts from the cdn only when the interface comes from it', () => {
    expect(scriptSources('bundled')).toEqual(["'self'"]);
    expect(scriptSources('cdn')).toEqual(["'self'", SWAGGER_CDN_ORIGIN]);
  });

  it('describes every endpoint', () => {
    const operations = Object.entries(document.paths).flatMap(
      ([path, methods]) =>
        Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(operations.sort()).toEqual([
      'DELETE /notifications/{id}',
      'GET /channels',
      'GET /health',
      'GET /notifications',
      'PATCH /notifications/{id}',
      'POST /auth/login',
      'POST /auth/register',
      'POST /notifications',
    ]);
  });

  it('requires the bearer token on notifications and not on auth', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(document.paths['/notifications'].post?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/notifications/{id}'].delete?.security).toEqual([
      { bearer: [] },
    ]);
    expect(document.paths['/auth/login'].post?.security).toBeUndefined();
    expect(document.paths['/auth/register'].post?.security).toBeUndefined();
  });

  it('takes the request body from the validation schema', () => {
    const body = document.paths['/notifications'].post?.requestBody as {
      content: Record<
        string,
        { schema: { required: string[]; properties: Record<string, object> } }
      >;
    };
    const schema = body.content['application/json'].schema;

    expect(schema.required).toEqual([
      'title',
      'content',
      'channel',
      'recipient',
    ]);
    expect(schema.properties.title).toMatchObject({
      type: 'string',
      minLength: 1,
      maxLength: 200,
    });
  });

  it('describes the responses, including the deliveries', () => {
    const responses = document.paths['/notifications'].post
      ?.responses as Record<
      string,
      {
        content?: Record<
          string,
          { schema: { properties: Record<string, object> } }
        >;
      }
    >;

    expect(Object.keys(responses).sort()).toEqual(['201', '400', '401', '429']);
    expect(
      responses['201'].content?.['application/json'].schema.properties,
    ).toHaveProperty('deliveries');
  });
});

import { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { withoutThrottling } from './support/without-throttling.js';
import {
  createOpenApiDocument,
  setupSwagger,
  SWAGGER_PATH,
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

import type { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
  type SwaggerCustomOptions,
} from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';
export const SWAGGER_UI_VERSION = '5.34.1';
export const SWAGGER_CDN_ORIGIN = 'https://cdn.jsdelivr.net';

export type SwaggerAssets = 'bundled' | 'cdn';

const CDN_BASE = `${SWAGGER_CDN_ORIGIN}/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const CDN_OPTIONS: SwaggerCustomOptions = {
  customCssUrl: `${CDN_BASE}/swagger-ui.css`,
  customJs: [
    `${CDN_BASE}/swagger-ui-bundle.js`,
    `${CDN_BASE}/swagger-ui-standalone-preset.js`,
  ],
};

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Notification Center API')
    .setDescription(
      'Create notifications and send them through email, SMS or push. ' +
        'Register, log in, and use the access token with the Authorize button.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(
  app: INestApplication,
  assets: SwaggerAssets = 'bundled',
): void {
  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    () => createOpenApiDocument(app),
    assets === 'cdn' ? CDN_OPTIONS : undefined,
  );
}

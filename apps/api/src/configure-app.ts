import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Env } from './config/env.js';
import {
  setupSwagger,
  SWAGGER_CDN_ORIGIN,
  type SwaggerAssets,
} from './swagger.js';

export function scriptSources(swaggerAssets: SwaggerAssets): string[] {
  return swaggerAssets === 'cdn' ? ["'self'", SWAGGER_CDN_ORIGIN] : ["'self'"];
}

export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const swaggerAssets = config.get('SWAGGER_ASSETS', { infer: true });

  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));
  app.useSecurityHeaders({
    contentSecurityPolicy: {
      directives: { scriptSrc: scriptSources(swaggerAssets) },
    },
  });
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  setupSwagger(app, swaggerAssets);
}

import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { APP_NAME } from '@skillboard/shared';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from './common/config/env.js';
import { requestIdMiddleware } from './common/request-id/request-id.middleware.js';

export const API_PREFIX = 'v1';

/** Everything main.ts and the e2e tests must agree on. Keep bootstrap-only code in main.ts. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }), credentials: true });
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
}

/** OpenAPI document generated from the Zod DTOs (ADR 0014). */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(`${APP_NAME} API`)
    .setDescription('Generated from Zod schemas in packages/shared. Do not edit by hand.')
    .setVersion(API_PREFIX)
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

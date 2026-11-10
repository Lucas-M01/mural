import swagger from '@fastify/swagger';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { HealthResponse } from '@mural/shared';
import scalar from '@scalar/fastify-api-reference';
import Fastify from 'fastify';

import type { PrismaClient } from '../generated/prisma/client.js';
import { registerAuth, type AuthConfig } from './auth.js';
import { coreRoutes } from './core-routes.js';
import { registerErrorHandlers } from './errors.js';

export function buildApp({
  logger = true,
  db,
  auth,
}: { logger?: boolean } & (
  { db: PrismaClient; auth: AuthConfig } | { db?: undefined; auth?: undefined }
) = {}) {
  const app = Fastify({
    logger: logger
      ? {
          redact: [
            'req.headers.authorization',
            'req.body.serverAuthCode',
            'res.body.token',
          ],
        }
      : false,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  }).withTypeProvider<TypeBoxTypeProvider>();
  registerErrorHandlers(app);

  app.register(swagger, {
    openapi: {
      info: { title: 'Mural API', version: '0.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  app.register(scalar, { routePrefix: '/docs' });

  app.register(async (instance) => {
    const api = instance.withTypeProvider<TypeBoxTypeProvider>();
    api.get(
      '/health',
      {
        schema: {
          description: 'Verifica se a API está no ar.',
          response: { 200: HealthResponse },
        },
      },
      async () => ({ status: 'ok' as const }),
    );
  });

  if (db) {
    app.register(
      async (api) => {
        await registerAuth(api, db, auth);
        await api.register(coreRoutes, { db });
      },
      { prefix: '/api/v1' },
    );
  }

  return app;
}

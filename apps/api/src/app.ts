import swagger from '@fastify/swagger';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { HealthResponse } from '@mural/shared';
import scalar from '@scalar/fastify-api-reference';
import Fastify from 'fastify';

import type { PrismaClient } from '../generated/prisma/client.js';
import { coreRoutes } from './core-routes.js';
import { registerErrorHandlers } from './errors.js';

export function buildApp({
  logger = true,
  db,
}: { logger?: boolean; db?: PrismaClient } = {}) {
  const app = Fastify({
    logger,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  }).withTypeProvider<TypeBoxTypeProvider>();
  registerErrorHandlers(app);

  app.register(swagger, {
    openapi: { info: { title: 'Mural API', version: '0.0.0' } },
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

  if (db) app.register(coreRoutes, { prefix: '/api/v1', db });

  return app;
}

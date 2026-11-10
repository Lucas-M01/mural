import swagger from '@fastify/swagger';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { HealthResponse } from '@mural/shared';
import scalar from '@scalar/fastify-api-reference';
import Fastify from 'fastify';

export function buildApp({ logger = true } = {}) {
  const app = Fastify({ logger }).withTypeProvider<TypeBoxTypeProvider>();

  app.register(swagger, {
    openapi: { info: { title: 'Mural API', version: '0.0.0' } },
  });
  app.register(scalar, { routePrefix: '/docs' });

  app.after(() => {
    app.get(
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

  return app;
}

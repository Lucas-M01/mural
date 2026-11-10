import type { FastifyInstance } from 'fastify';

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({
      error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' },
    }),
  );

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      const invalid = 'validation' in error && error.validation !== undefined;
      const code = invalid ? 'VALIDATION_ERROR' : 'INVALID_REQUEST';
      const message = invalid
        ? 'Dados da requisição inválidos.'
        : 'Requisição inválida.';
      return reply.code(error.statusCode).send({ error: { code, message } });
    }

    request.log.error({ err: error }, 'Erro interno da API');
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno da API.' },
    });
  });
}

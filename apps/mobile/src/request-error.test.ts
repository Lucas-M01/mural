import { describe, expect, it } from 'vitest';
import { friendlyError, RequestError, retryRead } from './request-error';

describe('friendlyError', () => {
  it.each([
    [new RequestError({ kind: 'network' }), 'Confira sua conexão'],
    [new RequestError({ kind: 'timeout' }), 'A resposta demorou demais'],
    [new RequestError({ kind: 'http', status: 404 }), 'pode ter sido removido'],
    [new RequestError({ kind: 'http', status: 409 }), 'Algo mudou'],
    [new RequestError({ kind: 'http', status: 429 }), 'Aguarde um pouco'],
    [
      new RequestError({ kind: 'http', status: 503 }),
      'O serviço está indisponível',
    ],
    [
      new RequestError({ kind: 'reorder-limit' }),
      'Arraste a tarefa por uma distância menor',
    ],
  ])('orienta a pessoa conforme o tipo de falha (%s)', (error, message) => {
    expect(friendlyError(error)).toContain(message);
  });

  it.each([
    new Error('EXPO_PUBLIC_API_URL inválida'),
    'TypeError: Network request failed',
    new RequestError(
      { kind: 'http', status: 400 },
      { error: { message: 'Falha do Prisma P1001' } },
    ),
    undefined,
  ])('usa texto genérico sem expor detalhes (%s)', (error) => {
    expect(friendlyError(error)).toBe(
      'Algo deu errado. Tente de novo em instantes.',
    );
  });

  it('ignora a mensagem enviada pelo servidor', () => {
    const error = new RequestError(
      { kind: 'http', status: 500 },
      new Error('Prisma P1001 em 127.0.0.1'),
    );
    expect(friendlyError(error)).toBe(
      'O serviço está indisponível no momento. Tente de novo em instantes.',
    );
  });
});

describe('retryRead', () => {
  it.each([
    new RequestError({ kind: 'network' }),
    new RequestError({ kind: 'timeout' }),
    new RequestError({ kind: 'http', status: 503 }),
  ])('repete uma vez após falha transitória (%s)', (error) => {
    expect(retryRead(0, error)).toBe(true);
    expect(retryRead(1, error)).toBe(false);
  });

  it.each([
    new RequestError({ kind: 'http', status: 404 }),
    new RequestError({ kind: 'http', status: 429 }),
    new Error('Resposta inválida'),
  ])('encerra a leitura após outras falhas (%s)', (error) => {
    expect(retryRead(0, error)).toBe(false);
  });
});

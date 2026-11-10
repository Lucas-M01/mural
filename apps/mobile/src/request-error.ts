type Failure =
  | { kind: 'network' | 'timeout' | 'reorder-limit' }
  | { kind: 'http'; status: number };

export class RequestError extends Error {
  constructor(
    readonly failure: Failure,
    cause?: unknown,
  ) {
    super(failure.kind === 'http' ? `HTTP ${failure.status}` : failure.kind, {
      cause,
    });
    this.name = 'RequestError';
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof RequestError) {
    switch (error.failure.kind) {
      case 'network':
        return 'Confira sua conexão e tente de novo.';
      case 'timeout':
        return 'A resposta demorou demais. Tente de novo.';
      case 'reorder-limit':
        return 'Arraste a tarefa por uma distância menor.';
      case 'http': {
        const { status } = error.failure;
        if (status === 404) return 'O item pode ter sido removido.';
        if (status === 409)
          return 'Algo mudou enquanto você usava o app. Tente de novo.';
        if (status === 429) return 'Aguarde um pouco antes de tentar de novo.';
        if (status >= 500)
          return 'O serviço está indisponível no momento. Tente de novo em instantes.';
      }
    }
  }
  return 'Algo deu errado. Tente de novo em instantes.';
}

export function retryRead(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1 || !(error instanceof RequestError)) return false;
  const { failure } = error;
  return (
    failure.kind === 'network' ||
    failure.kind === 'timeout' ||
    (failure.kind === 'http' && [500, 502, 503, 504].includes(failure.status))
  );
}

export function logRequestError(error: unknown) {
  // Warning and error logs can appear over the app in Expo Go.
  console.info(
    '[Mural] Falha na operação',
    error,
    error instanceof Error ? error.cause : undefined,
  );
}

import { queryOptions } from '@tanstack/react-query';

export type List = {
  id: string;
  title: string;
  color: string;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  isChecked: boolean;
  position: number;
};

type TaskPosition = Pick<Task, 'id' | 'position'>;

function apiBase() {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  try {
    const url = new URL(value ?? '');
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      url.host &&
      !url.search &&
      !url.hash
    ) {
      return url.href.replace(/\/+$/, '') + '/api/v1';
    }
  } catch {
    // URL can throw for malformed values.
  }
  throw new Error('Configure EXPO_PUBLIC_API_URL com a URL da API.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isList(value: unknown): value is List {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.color === 'string'
  );
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (value.notes === null || typeof value.notes === 'string') &&
    typeof value.isChecked === 'boolean' &&
    typeof value.position === 'number' &&
    Number.isInteger(value.position)
  );
}

function readList(value: unknown): List {
  if (isList(value)) return value;
  throw new Error('A API retornou uma lista inválida.');
}

function readArray<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): T[] {
  if (Array.isArray(value) && value.every(isItem)) return value;
  throw new Error('A API retornou dados inválidos.');
}

async function request(
  path: string,
  method = 'GET',
  body?: object,
): Promise<unknown> {
  const response = await fetch(apiBase() + path, {
    method,
    ...(body && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    if (
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.message === 'string'
    ) {
      throw new Error(payload.error.message);
    }
    throw new Error(`A API retornou HTTP ${response.status}.`);
  }

  return response.status === 204 ? undefined : response.json();
}

export const listsQuery = queryOptions({
  queryKey: ['lists'],
  queryFn: () => request('/lists').then((data) => readArray(data, isList)),
});

export const tasksQuery = (listId: string) =>
  queryOptions({
    queryKey: ['lists', listId, 'tasks'],
    queryFn: () =>
      request(`/lists/${listId}/tasks`).then((data) => readArray(data, isTask)),
  });

export const api = {
  createList: (input: Pick<List, 'title' | 'color'>) =>
    request('/lists', 'POST', input).then(readList),
  updateColor: (id: string, color: string) =>
    request(`/lists/${id}`, 'PATCH', { color }).then(readList),
  createTask: (
    listId: string,
    input: Pick<Task, 'title'> & { notes?: string },
  ) => request(`/lists/${listId}/tasks`, 'POST', input),
  toggleTask: (id: string) => request(`/tasks/${id}/toggle`, 'PATCH'),
  reorderTasks: (positions: TaskPosition[]) =>
    request('/tasks/reorder', 'PATCH', positions),
};

import { createDecipheriv, createHmac, randomUUID } from 'node:crypto';
import type { InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildApp } from './app.js';
import { createTestDatabase, testUser } from './test-database.js';

const google = vi.hoisted(() => ({
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
}));
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    getToken = google.getToken;
    verifyIdToken = google.verifyIdToken;
  },
}));

const db = createTestDatabase();
const encryptionKey = Buffer.alloc(32, 42);
const auth = {
  JWT_SECRET: 'chave-exclusiva-para-os-testes-de-jwt',
  TOKEN_ENCRYPTION_KEY: encryptionKey.toString('base64'),
  GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'test-secret',
};
const app = buildApp({ db, auth, logger: false });
const owner = testUser();
const outsider = testUser();
const prefix = '/api/v1';
const fixtureTitle = randomUUID();
let ownerId: string;
let outsiderId: string;
let ownerToken: string;
let outsiderToken: string;

async function loginAs(user: typeof owner, refreshToken?: string) {
  const idToken = 'id-token-de-teste';
  google.getToken.mockResolvedValueOnce({
    tokens: { id_token: idToken, refresh_token: refreshToken },
  });
  google.verifyIdToken.mockResolvedValueOnce({
    getPayload: () => ({
      sub: user.googleId,
      name: user.name,
      email: user.email,
      email_verified: true,
    }),
  });
  const response = await app.inject({
    method: 'POST',
    url: `${prefix}/auth/google`,
    payload: { serverAuthCode: 'codigo-de-teste' },
  });
  expect(response.statusCode).toBe(200);
  expect(google.getToken).toHaveBeenLastCalledWith('codigo-de-teste');
  expect(google.verifyIdToken).toHaveBeenLastCalledWith({
    idToken,
    audience: auth.GOOGLE_CLIENT_ID,
  });
  const { token } = response.json<{ token: string }>();
  return token;
}

const inject = (options: InjectOptions, token = ownerToken) =>
  app.inject({
    ...options,
    headers: { authorization: `Bearer ${token}`, ...options.headers },
  });

beforeAll(async () => {
  const refreshToken = 'refresh-token-de-teste';
  ownerToken = await loginAs(owner, refreshToken);
  outsiderToken = await loginAs(outsider);
  const stored = await db.user.findUniqueOrThrow({
    where: { googleId: owner.googleId },
  });
  const encrypted = stored.googleRefreshTokenEnc ?? '';
  expect(encrypted).not.toContain(refreshToken);
  const [version, iv, tag, ciphertext] = encrypted.split('.');
  expect(version).toBe('v1');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  expect(
    Buffer.concat([
      decipher.update(ciphertext, 'base64'),
      decipher.final(),
    ]).toString(),
  ).toBe(refreshToken);

  ownerToken = await loginAs(owner);
  expect(
    await db.user.findUnique({ where: { googleId: owner.googleId } }),
  ).toMatchObject({
    id: stored.id,
    googleRefreshTokenEnc: encrypted,
  });
  ownerId = stored.id;
  outsiderId = (
    await db.user.findUniqueOrThrow({ where: { googleId: outsider.googleId } })
  ).id;
});

afterAll(async () => {
  try {
    await app.close();
    const users = await db.user.findMany({
      where: { googleId: { in: [owner.googleId, outsider.googleId] } },
      select: { id: true },
    });
    const ids = users.map(({ id }) => id);
    await db.list.deleteMany({ where: { ownerId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  } finally {
    await db.$disconnect();
  }
});

describe('rotas de listas e tarefas', () => {
  it('cria, consulta, edita e exclui uma lista privada', async () => {
    const created = await inject({
      method: 'POST',
      url: `${prefix}/lists`,
      payload: { title: fixtureTitle },
    });
    expect(created.statusCode).toBe(201);
    const list = created.json<{ id: string }>();
    expect(list).toMatchObject({
      title: fixtureTitle,
      ownerId: ownerId,
      isShared: false,
      color: '#FFFFFF',
    });

    const all = await inject({ url: `${prefix}/lists` });
    expect(all.statusCode).toBe(200);
    expect(all.json()).toContainEqual(list);

    const url = `${prefix}/lists/${list.id}`;
    const patched = await inject({
      method: 'PATCH',
      url,
      payload: { color: '#ABC123' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ id: list.id, color: '#ABC123' });

    const deleted = await inject({ method: 'DELETE', url });
    expect(deleted.statusCode).toBe(204);
    expect(deleted.body).toBe('');
    expect((await inject({ url: `${url}/tasks` })).statusCode).toBe(404);
  });

  it('cria, consulta, edita, alterna, reordena e remove tarefas', async () => {
    const list = await db.list.create({
      data: {
        title: fixtureTitle,
        ownerId: ownerId,
        members: { create: { userId: ownerId, role: 'OWNER' } },
      },
    });
    const collection = `${prefix}/lists/${list.id}/tasks`;
    const created = await inject({
      method: 'POST',
      url: collection,
      payload: {
        title: 'Primeira',
        priority: 'HIGH',
        dueDate: '2026-12-01T10:00:00-03:00',
      },
    });
    expect(created.statusCode).toBe(201);
    const first = created.json<{ id: string }>();
    expect(first).toMatchObject({
      title: 'Primeira',
      position: 0,
      isChecked: false,
      priority: 'HIGH',
      dueDate: '2026-12-01T13:00:00.000Z',
    });

    const another = await inject({
      method: 'POST',
      url: collection,
      payload: { title: 'Segunda' },
    });
    expect(another.statusCode).toBe(201);
    const second = another.json<{ id: string }>();
    expect(second).toMatchObject({ position: 1, priority: 'MEDIUM' });

    const taskUrl = `${prefix}/tasks/${first.id}`;
    const patched = await inject({
      method: 'PATCH',
      url: taskUrl,
      payload: { notes: 'Detalhes', dueDate: null },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ notes: 'Detalhes', dueDate: null });
    const toggled = await inject({
      method: 'PATCH',
      url: `${taskUrl}/toggle`,
    });
    expect(toggled.statusCode).toBe(200);
    expect(toggled.json()).toMatchObject({ isChecked: true });

    const reordered = await inject({
      method: 'PATCH',
      url: `${prefix}/tasks/reorder`,
      payload: [
        { id: first.id, position: 1 },
        { id: second.id, position: 0 },
      ],
    });
    expect(reordered.statusCode).toBe(204);
    const beforeDelete = await inject({ url: collection });
    expect(beforeDelete.statusCode).toBe(200);
    expect(beforeDelete.json<{ id: string }[]>().map(({ id }) => id)).toEqual([
      second.id,
      first.id,
    ]);

    const deleted = await inject({ method: 'DELETE', url: taskUrl });
    expect(deleted.statusCode).toBe(204);
    expect(
      (await inject({ url: collection }))
        .json<{ id: string }[]>()
        .map(({ id }) => id),
    ).toEqual([second.id]);
    const changes = await inject({
      url: collection,
      query: { updatedSince: '2020-01-01T00:00:00Z' },
    });
    expect(changes.statusCode).toBe(200);
    expect(changes.json()).toContainEqual(
      expect.objectContaining({ id: first.id, deletedAt: expect.any(String) }),
    );
    expect(
      (await inject({ method: 'PATCH', url: `${taskUrl}/toggle` })).statusCode,
    ).toBe(404);
  });

  it('isola listas de dois usuários autenticados e valida corpo, parâmetro e query', async () => {
    const privateList = await db.list.create({
      data: {
        title: fixtureTitle,
        ownerId: outsiderId,
        members: { create: { userId: outsiderId, role: 'OWNER' } },
      },
    });
    const ownerList = await inject({
      method: 'POST',
      url: `${prefix}/lists`,
      payload: { title: fixtureTitle },
      headers: { 'x-user-id': outsiderId },
    });
    expect(ownerList.statusCode).toBe(201);
    expect(ownerList.json()).toMatchObject({ ownerId: ownerId });

    const all = await inject({ url: `${prefix}/lists` });
    const otherLists = await inject({ url: `${prefix}/lists` }, outsiderToken);
    expect(all.statusCode).toBe(200);
    expect(otherLists.statusCode).toBe(200);
    expect(all.json()).toContainEqual(ownerList.json());
    expect(all.json<{ id: string }[]>().map(({ id }) => id)).not.toContain(
      privateList.id,
    );
    expect(otherLists.json()).toEqual([
      expect.objectContaining({ id: privateList.id }),
    ]);
    const task = await inject(
      {
        method: 'POST',
        url: `${prefix}/lists/${privateList.id}/tasks`,
        payload: { title: 'Tarefa privada' },
      },
      outsiderToken,
    );
    expect(task.statusCode).toBe(201);
    const taskUrl = `${prefix}/tasks/${task.json<{ id: string }>().id}`;
    expect(
      (await inject({ method: 'PATCH', url: `${taskUrl}/toggle` })).statusCode,
    ).toBe(404);

    const forbidden = await inject({
      url: `${prefix}/lists/${privateList.id}/tasks`,
    });
    expect(forbidden.statusCode).toBe(404);
    expect(forbidden.json()).toEqual({
      error: { code: 'LIST_NOT_FOUND', message: 'Lista não encontrada.' },
    });

    const invalid = await Promise.all([
      inject({
        method: 'POST',
        url: `${prefix}/lists`,
        payload: { title: ' ', ownerId: outsiderId },
      }),
      inject({
        method: 'PATCH',
        url: `${prefix}/lists/${privateList.id}`,
        payload: {},
      }),
      inject({ method: 'DELETE', url: `${prefix}/tasks/invalid` }),
      inject({
        url: `${prefix}/lists/${privateList.id}/tasks?updatedSince=ontem`,
      }),
    ]);
    for (const response of invalid) {
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: { code: 'VALIDATION_ERROR' },
      });
    }
  });

  it.each([
    ['GET', '/me'],
    ['GET', '/lists'],
    ['POST', '/lists'],
    ['PATCH', '/lists/123'],
    ['DELETE', '/lists/123'],
    ['GET', '/lists/123/tasks'],
    ['POST', '/lists/123/tasks'],
    ['PATCH', '/tasks/123'],
    ['PATCH', '/tasks/123/toggle'],
    ['PATCH', '/tasks/reorder'],
    ['DELETE', '/tasks/123'],
  ] as const)('exige JWT em %s %s', async (method, path) => {
    const response = await app.inject({
      method,
      url: prefix + path,
      headers: { 'x-user-id': ownerId },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });

  it('rejeita JWT inválido ou expirado e identifica a sessão válida', async () => {
    const url = `${prefix}/me`;
    expect((await inject({ url }, 'token-invalido')).statusCode).toBe(401);
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({ sub: ownerId, exp: 1 }),
    ).toString('base64url');
    const signature = createHmac('sha256', auth.JWT_SECRET)
      .update(`${header}.${claims}`)
      .digest('base64url');
    expect(
      (await inject({ url }, `${header}.${claims}.${signature}`)).statusCode,
    ).toBe(401);
    const response = await inject({ url });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: ownerId,
      name: owner.name,
      email: owner.email,
      avatarUrl: null,
    });
  });

  it('rejeita uma identidade com e-mail não verificado', async () => {
    google.getToken.mockResolvedValueOnce({
      tokens: { id_token: 'id-token-de-teste' },
    });
    google.verifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        sub: owner.googleId,
        email: owner.email,
        email_verified: false,
      }),
    });
    const response = await app.inject({
      method: 'POST',
      url: `${prefix}/auth/google`,
      payload: { serverAuthCode: 'codigo-de-teste' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'INVALID_GOOGLE_LOGIN' },
    });
  });

  it('limita tentativas de login e não devolve detalhes do Google', async () => {
    google.getToken.mockRejectedValue(new Error('credencial sensível'));
    for (let attempt = 0; attempt < 11; attempt++) {
      const response = await app.inject({
        method: 'POST',
        url: `${prefix}/auth/google`,
        remoteAddress: '192.0.2.1',
        payload: { serverAuthCode: 'invalido' },
      });
      expect(response.statusCode).toBe(attempt < 10 ? 401 : 429);
      expect(response.body).not.toContain('credencial sensível');
    }
    expect((await inject({ url: `${prefix}/me` })).statusCode).toBe(200);
  });

  it.each([
    ['/lists', ['get', 'post']],
    ['/lists/{id}', ['patch', 'delete']],
    ['/lists/{id}/tasks', ['get', 'post']],
    ['/tasks/{id}', ['patch', 'delete']],
    ['/tasks/{id}/toggle', ['patch']],
    ['/tasks/reorder', ['patch']],
  ])('documenta %s no Swagger', async (path, methods) => {
    const paths = app.swagger().paths;
    for (const method of methods) {
      expect(paths?.[`${prefix}${path}`]).toHaveProperty(method);
    }
  });
});

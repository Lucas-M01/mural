import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { developmentUser } from './development-user.js';
import { createTestDatabase, testUser } from './test-database.js';

const db = createTestDatabase();
const app = buildApp({ db, logger: false });
const outsider = testUser();
const prefix = '/api/v1';
const fixtureTitle = randomUUID();

beforeAll(async () => {
  await db.user.upsert({
    where: { id: developmentUser.id },
    create: developmentUser,
    update: {},
  });
  await db.user.create({ data: outsider });
  await app.ready();
});

afterAll(async () => {
  try {
    await app.close();
    await db.list.deleteMany({
      where: {
        OR: [{ title: { startsWith: fixtureTitle } }, { ownerId: outsider.id }],
      },
    });
    await db.user.deleteMany({ where: { id: outsider.id } });
  } finally {
    await db.$disconnect();
  }
});

describe('rotas de listas e tarefas', () => {
  it('cria, consulta, edita e exclui uma lista privada', async () => {
    const created = await app.inject({
      method: 'POST',
      url: `${prefix}/lists`,
      payload: { title: fixtureTitle },
    });
    expect(created.statusCode).toBe(201);
    const list = created.json<{ id: string }>();
    expect(list).toMatchObject({
      title: fixtureTitle,
      ownerId: developmentUser.id,
      isShared: false,
      color: '#FFFFFF',
    });

    const all = await app.inject({ url: `${prefix}/lists` });
    expect(all.statusCode).toBe(200);
    expect(all.json()).toContainEqual(list);

    const url = `${prefix}/lists/${list.id}`;
    const patched = await app.inject({
      method: 'PATCH',
      url,
      payload: { color: '#ABC123' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ id: list.id, color: '#ABC123' });

    const deleted = await app.inject({ method: 'DELETE', url });
    expect(deleted.statusCode).toBe(204);
    expect(deleted.body).toBe('');
    expect((await app.inject({ url: `${url}/tasks` })).statusCode).toBe(404);
  });

  it('cria, consulta, edita, alterna, reordena e remove tarefas', async () => {
    const list = await db.list.create({
      data: {
        title: fixtureTitle,
        ownerId: developmentUser.id,
        members: { create: { userId: developmentUser.id, role: 'OWNER' } },
      },
    });
    const collection = `${prefix}/lists/${list.id}/tasks`;
    const created = await app.inject({
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

    const another = await app.inject({
      method: 'POST',
      url: collection,
      payload: { title: 'Segunda' },
    });
    expect(another.statusCode).toBe(201);
    const second = another.json<{ id: string }>();
    expect(second).toMatchObject({ position: 1, priority: 'MEDIUM' });

    const taskUrl = `${prefix}/tasks/${first.id}`;
    const patched = await app.inject({
      method: 'PATCH',
      url: taskUrl,
      payload: { notes: 'Detalhes', dueDate: null },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ notes: 'Detalhes', dueDate: null });
    const toggled = await app.inject({
      method: 'PATCH',
      url: `${taskUrl}/toggle`,
    });
    expect(toggled.statusCode).toBe(200);
    expect(toggled.json()).toMatchObject({ isChecked: true });

    const reordered = await app.inject({
      method: 'PATCH',
      url: `${prefix}/tasks/reorder`,
      payload: [
        { id: first.id, position: 1 },
        { id: second.id, position: 0 },
      ],
    });
    expect(reordered.statusCode).toBe(204);
    const beforeDelete = await app.inject({ url: collection });
    expect(beforeDelete.statusCode).toBe(200);
    expect(beforeDelete.json<{ id: string }[]>().map(({ id }) => id)).toEqual([
      second.id,
      first.id,
    ]);

    const deleted = await app.inject({ method: 'DELETE', url: taskUrl });
    expect(deleted.statusCode).toBe(204);
    expect(
      (await app.inject({ url: collection }))
        .json<{ id: string }[]>()
        .map(({ id }) => id),
    ).toEqual([second.id]);
    const changes = await app.inject({
      url: collection,
      query: { updatedSince: '2020-01-01T00:00:00Z' },
    });
    expect(changes.statusCode).toBe(200);
    expect(changes.json()).toContainEqual(
      expect.objectContaining({ id: first.id, deletedAt: expect.any(String) }),
    );
    expect(
      (await app.inject({ method: 'PATCH', url: `${taskUrl}/toggle` }))
        .statusCode,
    ).toBe(404);
  });

  it('aplica o usuário fixo e valida corpo, parâmetro e query', async () => {
    const privateList = await db.list.create({
      data: {
        title: fixtureTitle,
        ownerId: outsider.id,
        members: { create: { userId: outsider.id, role: 'OWNER' } },
      },
    });
    const all = await app.inject({
      url: `${prefix}/lists`,
      headers: { 'x-user-id': outsider.id },
    });
    expect(all.json<{ id: string }[]>().map(({ id }) => id)).not.toContain(
      privateList.id,
    );
    const forbidden = await app.inject({
      url: `${prefix}/lists/${privateList.id}/tasks`,
    });
    expect(forbidden.statusCode).toBe(404);
    expect(forbidden.json()).toEqual({
      error: { code: 'LIST_NOT_FOUND', message: 'Lista não encontrada.' },
    });

    const invalid = await Promise.all([
      app.inject({
        method: 'POST',
        url: `${prefix}/lists`,
        payload: { title: ' ', ownerId: outsider.id },
      }),
      app.inject({
        method: 'PATCH',
        url: `${prefix}/lists/${privateList.id}`,
        payload: {},
      }),
      app.inject({ method: 'DELETE', url: `${prefix}/tasks/invalid` }),
      app.inject({
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

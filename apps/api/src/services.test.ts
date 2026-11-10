import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertListAccess, listService } from './list-service.js';
import { taskService } from './task-service.js';
import { createTestDatabase, testUser } from './test-database.js';

const db = createTestDatabase();
const lists = listService(db);
const tasks = taskService(db);
const owner = testUser();
const other = testUser();

beforeAll(async () => {
  await db.user.createMany({ data: [owner, other] });
});

afterAll(async () => {
  try {
    const ids = [owner.id, other.id];
    await db.list.deleteMany({ where: { ownerId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
  } finally {
    await db.$disconnect();
  }
});

describe('regras de acesso e escrita', () => {
  it('cria a associação do dono e exige associação mesmo para o proprietário', async () => {
    const list = await lists.create(owner.id, { title: 'Privada' });
    expect(
      await db.listMember.findMany({ where: { listId: list.id } }),
    ).toEqual([{ listId: list.id, userId: owner.id, role: 'OWNER' }]);
    expect(await assertListAccess(db, owner.id, list.id)).toMatchObject({
      id: list.id,
    });
    expect(await lists.findAll(other.id)).toEqual([]);
    await expect(
      lists.update(other.id, list.id, { title: 'Invasão' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await db.listMember.delete({
      where: { listId_userId: { listId: list.id, userId: owner.id } },
    });
    await expect(assertListAccess(db, owner.id, list.id)).rejects.toMatchObject(
      { statusCode: 404 },
    );
  });

  it('permite editar como membro e restringe a exclusão ao dono', async () => {
    const list = await lists.create(owner.id, { title: 'Compartilhada' });
    await db.listMember.create({ data: { listId: list.id, userId: other.id } });
    expect(
      await lists.update(other.id, list.id, { title: 'Renomeada' }),
    ).toMatchObject({ title: 'Renomeada' });
    await expect(lists.remove(other.id, list.id)).rejects.toMatchObject({
      statusCode: 403,
    });
    await lists.remove(owner.id, list.id);
    await expect(assertListAccess(db, other.id, list.id)).rejects.toMatchObject(
      { statusCode: 404 },
    );
  });

  it('protege tarefas de outra lista e não aplica um lote de reordenação parcialmente', async () => {
    const ownList = await lists.create(owner.id, { title: 'Minha' });
    const otherList = await lists.create(other.id, {
      title: 'De outra pessoa',
    });
    // A tarefa acessível é processada primeiro para exercitar o rollback.
    const own = await db.task.create({
      data: {
        id: `0${randomUUID().slice(1)}`,
        title: 'Minha tarefa',
        listId: ownList.id,
        createdById: owner.id,
      },
    });
    const hidden = await db.task.create({
      data: {
        id: `f${randomUUID().slice(1)}`,
        title: 'Tarefa privada',
        listId: otherList.id,
        createdById: other.id,
      },
    });

    await expect(tasks.findAll(owner.id, otherList.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      tasks.create(owner.id, otherList.id, { title: 'Invasão' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      tasks.update(owner.id, hidden.id, { title: 'Invasão' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(tasks.toggle(owner.id, hidden.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(tasks.remove(owner.id, hidden.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      tasks.reorder(owner.id, [
        { id: own.id, position: 10 },
        { id: hidden.id, position: 20 },
      ]),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(await tasks.findAll(owner.id, ownList.id)).toMatchObject([
      { id: own.id, position: 0 },
    ]);
    await expect(
      tasks.reorder(owner.id, [
        { id: own.id, position: 1 },
        { id: own.id, position: 2 },
      ]),
    ).rejects.toMatchObject({ statusCode: 400, code: 'DUPLICATE_TASK' });
  });

  it('preserva as duas alternâncias concorrentes', async () => {
    const list = await lists.create(owner.id, { title: 'Concorrência' });
    const task = await tasks.create(owner.id, list.id, { title: 'Alternar' });
    const results = await Promise.all([
      tasks.toggle(owner.id, task.id),
      tasks.toggle(owner.id, task.id),
    ]);
    expect(results.map(({ isChecked }) => isChecked)).toEqual(
      expect.arrayContaining([true, false]),
    );
    expect(await tasks.findAll(owner.id, list.id)).toMatchObject([
      { id: task.id, isChecked: false },
    ]);
  });
});

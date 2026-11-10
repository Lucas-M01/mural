import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from './errors.js';
import { assertListAccess, listMembership } from './list-service.js';
import type { TaskCreate, TaskPatch, TaskReorder } from './schemas.js';

const taskNotFound = () =>
  new ApiError(404, 'TASK_NOT_FOUND', 'Tarefa não encontrada.');

async function taskTransaction<T>(
  db: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: 'Serializable',
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2034'
      )
        throw error;
      if (attempt === 3)
        throw new ApiError(
          409,
          'WRITE_CONFLICT',
          'Conflito de escrita. Tente novamente.',
        );
    }
  }
}

function parseDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Data inválida.');
  return date;
}

function taskFields({ dueDate, reminderAt, ...fields }: TaskPatch) {
  return {
    ...fields,
    dueDate: dueDate ? parseDate(dueDate) : dueDate,
    reminderAt: reminderAt ? parseDate(reminderAt) : reminderAt,
  };
}

function activeTasks(userId: string) {
  return {
    deletedAt: null,
    list: listMembership(userId),
  } satisfies Prisma.TaskWhereInput;
}

export function taskService(db: PrismaClient) {
  return {
    async findAll(userId: string, listId: string, updatedSince?: string) {
      await assertListAccess(db, userId, listId);
      return db.task.findMany({
        where: {
          listId,
          list: listMembership(userId),
          ...(updatedSince
            ? { updatedAt: { gt: parseDate(updatedSince) } }
            : { deletedAt: null }),
        },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      });
    },

    create(userId: string, listId: string, data: TaskCreate) {
      return taskTransaction(db, async (tx) => {
        await assertListAccess(tx, userId, listId);
        const last = await tx.task.findFirst({
          where: { ...activeTasks(userId), listId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = Math.min((last?.position ?? -1) + 1, 2147483647);
        return tx.task.create({
          data: {
            ...taskFields(data),
            title: data.title,
            listId,
            createdById: userId,
            position,
          },
        });
      });
    },

    async update(userId: string, id: string, data: TaskPatch) {
      try {
        return await db.task.update({
          where: { id, ...activeTasks(userId) },
          data: taskFields(data),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        )
          throw taskNotFound();
        throw error;
      }
    },

    toggle(userId: string, id: string) {
      return taskTransaction(db, async (tx) => {
        const where = { id, ...activeTasks(userId) };
        const task = await tx.task.findUnique({
          where,
          select: { isChecked: true },
        });
        if (!task) throw taskNotFound();
        return tx.task.update({ where, data: { isChecked: !task.isChecked } });
      });
    },

    async reorder(userId: string, entries: TaskReorder) {
      if (new Set(entries.map(({ id }) => id)).size !== entries.length) {
        throw new ApiError(
          400,
          'DUPLICATE_TASK',
          'A mesma tarefa aparece mais de uma vez.',
        );
      }
      await taskTransaction(db, async (tx) => {
        for (const { id, position } of [...entries].sort((a, b) =>
          a.id.localeCompare(b.id),
        )) {
          const result = await tx.task.updateMany({
            where: { id, ...activeTasks(userId) },
            data: { position },
          });
          if (!result.count) throw taskNotFound();
        }
      });
    },

    async remove(userId: string, id: string) {
      const result = await db.task.updateMany({
        where: { id, ...activeTasks(userId) },
        data: { deletedAt: new Date() },
      });
      if (!result.count) throw taskNotFound();
    },
  };
}

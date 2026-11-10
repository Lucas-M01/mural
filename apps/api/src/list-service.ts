import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from './errors.js';
import type { ListCreate, ListPatch } from './schemas.js';

export function listMembership(userId: string) {
  return { members: { some: { userId } } } satisfies Prisma.ListWhereInput;
}

export async function assertListAccess(
  db: Prisma.TransactionClient,
  userId: string,
  id: string,
) {
  const list = await db.list.findUnique({
    where: { id, ...listMembership(userId) },
  });
  if (!list) throw new ApiError(404, 'LIST_NOT_FOUND', 'Lista não encontrada.');
  return list;
}

export function listService(db: PrismaClient) {
  return {
    findAll(userId: string) {
      return db.list.findMany({
        where: listMembership(userId),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    },

    create(userId: string, data: ListCreate) {
      return db.list.create({
        data: {
          ...data,
          owner: { connect: { id: userId } },
          members: { create: { userId, role: 'OWNER' } },
        },
      });
    },

    async update(userId: string, id: string, data: ListPatch) {
      await assertListAccess(db, userId, id);
      const [list] = await db.list.updateManyAndReturn({
        where: { id, ...listMembership(userId) },
        data,
      });
      if (!list)
        throw new ApiError(404, 'LIST_NOT_FOUND', 'Lista não encontrada.');
      return list;
    },

    async remove(userId: string, id: string) {
      const list = await assertListAccess(db, userId, id);
      if (list.ownerId !== userId) {
        throw new ApiError(
          403,
          'LIST_OWNER_REQUIRED',
          'Apenas o dono pode excluir a lista.',
        );
      }
      const result = await db.list.deleteMany({
        where: { id, ownerId: userId, ...listMembership(userId) },
      });
      if (!result.count)
        throw new ApiError(404, 'LIST_NOT_FOUND', 'Lista não encontrada.');
    },
  };
}

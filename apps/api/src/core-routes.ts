import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import type { FastifyPluginAsync } from 'fastify';
import type { List, PrismaClient, Task } from '../generated/prisma/client.js';
import { developmentUser } from './development-user.js';
import { listService } from './list-service.js';
import {
  ErrorResponse,
  IdParams,
  ListCreate,
  ListPatch,
  ListResponse,
  TaskCreate,
  TaskPatch,
  TaskReorder,
  TaskResponse,
  TasksQuery,
} from './schemas.js';
import { taskService } from './task-service.js';

declare module 'fastify' {
  interface FastifyRequest {
    developmentUserId: string;
  }
}

function serializeList(list: List) {
  return {
    ...list,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  };
}

function serializeTask(task: Task) {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    dueDate: task.dueDate?.toISOString() ?? null,
    reminderAt: task.reminderAt?.toISOString() ?? null,
    deletedAt: task.deletedAt?.toISOString() ?? null,
  };
}

const invalid = { 400: ErrorResponse };
const missing = { ...invalid, 404: ErrorResponse };
const conflict = { ...missing, 409: ErrorResponse };
const noContent = Type.Null({ description: 'Operação concluída.' });

export const coreRoutes: FastifyPluginAsync<{ db: PrismaClient }> = async (
  instance,
  { db },
) => {
  const app = instance.withTypeProvider<TypeBoxTypeProvider>();
  const lists = listService(db);
  const tasks = taskService(db);

  app.decorateRequest('developmentUserId', '');
  app.addHook('onRequest', async (request) => {
    request.developmentUserId = developmentUser.id;
  });

  app.get(
    '/lists',
    {
      schema: { tags: ['Listas'], response: { 200: Type.Array(ListResponse) } },
    },
    async (request) =>
      (await lists.findAll(request.developmentUserId)).map(serializeList),
  );

  app.post(
    '/lists',
    {
      schema: {
        tags: ['Listas'],
        body: ListCreate,
        response: { 201: ListResponse, ...invalid },
      },
    },
    async (request, reply) => {
      const list = await lists.create(request.developmentUserId, request.body);
      return reply.code(201).send(serializeList(list));
    },
  );

  app.patch(
    '/lists/:id',
    {
      schema: {
        tags: ['Listas'],
        params: IdParams,
        body: ListPatch,
        response: { 200: ListResponse, ...missing },
      },
    },
    async (request) =>
      serializeList(
        await lists.update(
          request.developmentUserId,
          request.params.id,
          request.body,
        ),
      ),
  );

  app.delete(
    '/lists/:id',
    {
      schema: {
        tags: ['Listas'],
        params: IdParams,
        response: { 204: noContent, ...missing, 403: ErrorResponse },
      },
    },
    async (request, reply) => {
      await lists.remove(request.developmentUserId, request.params.id);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/lists/:id/tasks',
    {
      schema: {
        tags: ['Tarefas'],
        params: IdParams,
        querystring: TasksQuery,
        response: { 200: Type.Array(TaskResponse), ...missing },
      },
    },
    async (request) =>
      (
        await tasks.findAll(
          request.developmentUserId,
          request.params.id,
          request.query.updatedSince,
        )
      ).map(serializeTask),
  );

  app.post(
    '/lists/:id/tasks',
    {
      schema: {
        tags: ['Tarefas'],
        params: IdParams,
        body: TaskCreate,
        response: { 201: TaskResponse, ...conflict },
      },
    },
    async (request, reply) => {
      const task = await tasks.create(
        request.developmentUserId,
        request.params.id,
        request.body,
      );
      return reply.code(201).send(serializeTask(task));
    },
  );

  app.patch(
    '/tasks/:id',
    {
      schema: {
        tags: ['Tarefas'],
        params: IdParams,
        body: TaskPatch,
        response: { 200: TaskResponse, ...missing },
      },
    },
    async (request) =>
      serializeTask(
        await tasks.update(
          request.developmentUserId,
          request.params.id,
          request.body,
        ),
      ),
  );

  app.patch(
    '/tasks/:id/toggle',
    {
      schema: {
        tags: ['Tarefas'],
        params: IdParams,
        response: { 200: TaskResponse, ...conflict },
      },
    },
    async (request) =>
      serializeTask(
        await tasks.toggle(request.developmentUserId, request.params.id),
      ),
  );

  app.patch(
    '/tasks/reorder',
    {
      schema: {
        tags: ['Tarefas'],
        body: TaskReorder,
        response: { 204: noContent, ...conflict },
      },
    },
    async (request, reply) => {
      await tasks.reorder(request.developmentUserId, request.body);
      return reply.code(204).send(null);
    },
  );

  app.delete(
    '/tasks/:id',
    {
      schema: {
        tags: ['Tarefas'],
        params: IdParams,
        response: { 204: noContent, ...missing },
      },
    },
    async (request, reply) => {
      await tasks.remove(request.developmentUserId, request.params.id);
      return reply.code(204).send(null);
    },
  );
};

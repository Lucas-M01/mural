import { Type, type Static } from '@sinclair/typebox';

const uuid = Type.String({ format: 'uuid' });
const date = Type.String({ format: 'date-time' });
const title = Type.String({ minLength: 1, maxLength: 200, pattern: '\\S' });
const color = Type.String({ pattern: '^#[0-9a-fA-F]{6}$' });
const notes = Type.Union([Type.String({ maxLength: 10000 }), Type.Null()]);
const priority = Type.Union([
  Type.Literal('LOW'),
  Type.Literal('MEDIUM'),
  Type.Literal('HIGH'),
]);
const nullableDate = Type.Union([date, Type.Null()]);
const position = Type.Integer({ minimum: 0, maximum: 2147483647 });

export const IdParams = Type.Object({ id: uuid });
export const TasksQuery = Type.Object(
  { updatedSince: Type.Optional(date) },
  { additionalProperties: false },
);
export const ErrorResponse = Type.Object({
  error: Type.Object({ code: Type.String(), message: Type.String() }),
});

export const ListCreate = Type.Object(
  { title, color: Type.Optional(color) },
  { additionalProperties: false },
);
export const ListPatch = Type.Partial(ListCreate, {
  minProperties: 1,
  additionalProperties: false,
});
export const ListResponse = Type.Object({
  id: uuid,
  title,
  color,
  isShared: Type.Boolean(),
  ownerId: uuid,
  createdAt: date,
  updatedAt: date,
});

export const TaskCreate = Type.Object(
  {
    title,
    notes: Type.Optional(notes),
    priority: Type.Optional(priority),
    dueDate: Type.Optional(nullableDate),
    reminderAt: Type.Optional(nullableDate),
  },
  { additionalProperties: false },
);
export const TaskPatch = Type.Partial(TaskCreate, {
  minProperties: 1,
  additionalProperties: false,
});
export const TaskReorder = Type.Array(
  Type.Object({ id: uuid, position }, { additionalProperties: false }),
  { minItems: 1, maxItems: 100 },
);
export const TaskResponse = Type.Object({
  id: uuid,
  listId: uuid,
  title,
  notes,
  isChecked: Type.Boolean(),
  priority,
  position,
  dueDate: nullableDate,
  reminderAt: nullableDate,
  createdById: uuid,
  assignedToId: Type.Union([uuid, Type.Null()]),
  createdAt: date,
  updatedAt: date,
  deletedAt: nullableDate,
});

export type ListCreate = Static<typeof ListCreate>;
export type ListPatch = Static<typeof ListPatch>;
export type TaskCreate = Static<typeof TaskCreate>;
export type TaskPatch = Static<typeof TaskPatch>;
export type TaskReorder = Static<typeof TaskReorder>;

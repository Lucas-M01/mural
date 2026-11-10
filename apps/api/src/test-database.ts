import { randomUUID } from 'node:crypto';
import { createDatabase } from './database.js';

export function createTestDatabase() {
  return createDatabase(
    process.env.TEST_DATABASE_URL ??
      'postgresql://todo:todo@127.0.0.1:5433/todo_test',
  );
}

export function testUser() {
  const id = randomUUID();
  return {
    id,
    name: 'Usuário de teste',
    googleId: id,
    email: `${id}@example.test`,
  };
}

import { createDatabase } from '../src/database.js';
import { developmentUser } from '../src/development-user.js';
import { loadEnv } from '../src/env.js';

const { DATABASE_URL, NODE_ENV } = loadEnv();
if (NODE_ENV === 'production')
  throw new Error('Seed disponível em desenvolvimento e testes.');

const db = createDatabase(DATABASE_URL);
try {
  await db.user.upsert({
    where: { id: developmentUser.id },
    create: developmentUser,
    update: {},
  });
} finally {
  await db.$disconnect();
}

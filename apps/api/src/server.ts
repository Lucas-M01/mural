import { buildApp } from './app.js';
import { createDatabase } from './database.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const db = createDatabase(env.DATABASE_URL);
const app = buildApp({ db, auth: env });
app.addHook('onClose', () => db.$disconnect());

try {
  await app.listen({ host: '0.0.0.0', port: env.PORT });
} catch (error) {
  app.log.error({ err: error }, 'Falha ao iniciar a API');
  await app.close();
  process.exitCode = 1;
}

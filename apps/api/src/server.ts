import { buildApp } from './app.js';
import { createDatabase } from './database.js';
import { loadEnv } from './env.js';

const { DATABASE_URL, NODE_ENV, PORT } = loadEnv();
if (NODE_ENV === 'production') {
  throw new Error(
    'A API com usuário fixo só pode ser executada em desenvolvimento e testes.',
  );
}

const db = createDatabase(DATABASE_URL);
const app = buildApp({ db });
app.addHook('onClose', () => db.$disconnect());

try {
  await app.listen({ host: '0.0.0.0', port: PORT });
} catch (error) {
  app.log.error({ err: error }, 'Falha ao iniciar a API');
  await app.close();
  process.exitCode = 1;
}

import { buildApp } from './app.js';
import { loadEnv } from './env.js';

const app = buildApp();

try {
  const { PORT } = loadEnv();
  await app.listen({ host: '0.0.0.0', port: PORT });
} catch (error) {
  app.log.error({ err: error }, 'Falha ao iniciar a API');
  await app.close();
  process.exitCode = 1;
}

import { Type, type Static } from '@sinclair/typebox';
import { envSchema } from 'env-schema';

const schema = Type.Object({
  NODE_ENV: Type.Union(
    [
      Type.Literal('development'),
      Type.Literal('test'),
      Type.Literal('production'),
    ],
    { default: 'development' },
  ),
  PORT: Type.Integer({ minimum: 1, maximum: 65535, default: 3333 }),
  DATABASE_URL: Type.String({ pattern: '^postgres(ql)?://[^\\s]+$' }),
  REDIS_URL: Type.String({ pattern: '^rediss?://[^\\s]+$' }),
});

export function loadEnv() {
  return envSchema<Static<typeof schema>>({ schema });
}

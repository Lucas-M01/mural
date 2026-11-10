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
  JWT_SECRET: Type.String({ minLength: 32 }),
  TOKEN_ENCRYPTION_KEY: Type.String({
    pattern: '^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$',
  }),
  GOOGLE_CLIENT_ID: Type.String({
    pattern: '^[A-Za-z0-9_-]+\\.apps\\.googleusercontent\\.com$',
  }),
  GOOGLE_CLIENT_SECRET: Type.String({ minLength: 1, pattern: '^\\S+$' }),
  REDIS_URL: Type.String({ pattern: '^rediss?://[^\\s]+$' }),
});

export function loadEnv() {
  return envSchema<Static<typeof schema>>({ schema });
}

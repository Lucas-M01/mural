import { createCipheriv, randomBytes } from 'node:crypto';

import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { OAuth2Client } from 'google-auth-library';

import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from './errors.js';
import { ErrorResponse } from './schemas.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest): Promise<void>;
  }
}

export type AuthConfig = {
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

function encryptRefreshToken(token: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export async function registerAuth(
  instance: FastifyInstance,
  db: PrismaClient,
  config: AuthConfig,
) {
  const app = instance.withTypeProvider<TypeBoxTypeProvider>();
  const key = Buffer.from(config.TOKEN_ENCRYPTION_KEY, 'base64');
  const google = new OAuth2Client(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    '',
  );
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { algorithm: 'HS256', expiresIn: '7d' },
    verify: { algorithms: ['HS256'] },
  });
  await app.register(rateLimit, { global: false });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
      if (typeof request.user.sub === 'string' && request.user.sub.length > 0)
        return;
    } catch {
      // JWT errors can contain credential details.
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
  });

  app.post(
    '/auth/google',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        tags: ['Autenticação'],
        body: Type.Object(
          {
            serverAuthCode: Type.String({
              minLength: 1,
              maxLength: 4096,
              pattern: '^\\S+$',
            }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: Type.Object({ token: Type.String() }),
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
          429: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const invalid = new ApiError(
        401,
        'INVALID_GOOGLE_LOGIN',
        'Login do Google inválido.',
      );
      let identity;
      let refreshToken;
      try {
        const { tokens } = await google.getToken(request.body.serverAuthCode);
        if (!tokens.id_token) throw invalid;
        const ticket = await google.verifyIdToken({
          idToken: tokens.id_token,
          audience: config.GOOGLE_CLIENT_ID,
        });
        identity = ticket.getPayload();
        refreshToken = tokens.refresh_token;
      } catch {
        throw invalid;
      }

      if (!identity?.sub || !identity.email || identity.email_verified !== true)
        throw invalid;
      const profile = {
        email: identity.email,
        name: identity.name || identity.email,
        avatarUrl: identity.picture ?? null,
      };
      const credentials = refreshToken
        ? { googleRefreshTokenEnc: encryptRefreshToken(refreshToken, key) }
        : {};
      const user = await db.user
        .upsert({
          where: { googleId: identity.sub },
          create: { googleId: identity.sub, ...profile, ...credentials },
          update: { ...profile, ...credentials },
          select: { id: true },
        })
        .catch((error: unknown) => {
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'P2002'
          ) {
            throw new ApiError(
              409,
              'ACCOUNT_CONFLICT',
              'Já existe uma conta com este e-mail.',
            );
          }
          throw new ApiError(500, 'INTERNAL_ERROR', 'Erro interno da API.');
        });

      reply.header('Cache-Control', 'no-store');
      return { token: await reply.jwtSign({ sub: user.id }) };
    },
  );
}

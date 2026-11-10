FROM node:24-alpine

WORKDIR /app
RUN apk add --no-cache openssl && npm install --global pnpm@11.1.3

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm --filter @mural/api... install --frozen-lockfile

COPY apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma/ apps/api/prisma/
COPY apps/api/src/ apps/api/src/
COPY packages/shared/src/ packages/shared/src/

WORKDIR /app/apps/api
RUN pnpm exec prisma generate

USER node
CMD ["sh", "-ec", "pnpm db:migrate && pnpm db:seed && exec node --import tsx src/server.ts"]

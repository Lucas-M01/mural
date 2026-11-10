FROM node:24-alpine

WORKDIR /app
RUN npm install --global pnpm@11.1.3

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm --filter @mural/api... install --prod --frozen-lockfile

COPY apps/api/src/ apps/api/src/
COPY packages/shared/src/ packages/shared/src/

WORKDIR /app/apps/api
USER node
CMD ["node", "--import", "tsx", "src/server.ts"]

# Mural

App mobile de notas e tarefas para duas pessoas. A API já permite criar listas privadas e gerenciar tarefas.

## Requisitos

- Node.js 24 LTS e pnpm 11.1.3
- Docker com o plugin Compose
- Celular Android ou iOS com [Expo Go compatível com o SDK 58](https://expo.dev/go)

## API e infraestrutura

Na raiz do projeto, suba a API, o PostgreSQL e o Redis:

```sh
docker compose up --build --wait
curl --fail http://localhost:3333/health
```

O healthcheck deve retornar HTTP 200 com `{"status":"ok"}`. O contêiner da API aplica as migrations e executa o seed de desenvolvimento na inicialização. A documentação da API está em [localhost:3333/docs](http://localhost:3333/docs/).

Para desenvolver a API com recarga automática, rode os comandos abaixo na raiz do projeto. Se você já subiu a pilha completa, pare o contêiner da API com `docker compose stop api` para liberar a porta 3333.

```sh
docker compose up -d postgres redis
pnpm install
cp -n .env.example .env
pnpm --filter @mural/api db:generate
pnpm --filter @mural/api db:migrate
pnpm --filter @mural/api db:seed
pnpm api:dev
```

As URLs dos serviços em `.env.example` são para execução local. O Compose configura as URLs internas para a API. Caso a porta 3333 esteja ocupada, use outro valor de `PORT` no `.env`.

As rotas de listas e tarefas ficam em `/api/v1` e usam o usuário fixo do seed. Para experimentar no Swagger, crie uma lista com `POST /api/v1/lists` enviando `{"title":"Compras"}`. Use o ID retornado em `POST /api/v1/lists/{id}/tasks` para criar a primeira tarefa.

## App no celular

```sh
pnpm install
pnpm --filter @mural/mobile start
```

Conecte o celular e o computador à mesma rede e abra o QR code no Expo Go. A tela inicial deve exibir **Mural**.

## Checagens

Os testes de integração usam PostgreSQL em um contêiner separado, com armazenamento temporário. Gere o Prisma Client antes das checagens e aplique a migration ao banco de teste.

```sh
pnpm --filter @mural/api db:generate
docker compose up -d --wait postgres-test
DATABASE_URL=postgresql://todo:todo@127.0.0.1:5433/todo_test pnpm --filter @mural/api db:migrate
pnpm lint
pnpm typecheck
pnpm test
```

Para encerrar o banco de teste, rode `docker compose stop postgres-test`.

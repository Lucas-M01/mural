# Mural

Base de um app mobile de notas e tarefas para duas pessoas.

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

O healthcheck deve retornar HTTP 200 com `{"status":"ok"}`. A documentação da API está em [localhost:3333/docs](http://localhost:3333/docs/).

Para desenvolver a API com recarga automática, rode os comandos abaixo na raiz do projeto. Se você já subiu a pilha completa, pare o contêiner da API com `docker compose stop api` para liberar a porta 3333.

```sh
docker compose up -d postgres redis
pnpm install
cp -n .env.example .env
pnpm api:dev
```

As URLs dos serviços em `.env.example` são para execução local. O Compose configura as URLs internas para a API. Caso a porta 3333 esteja ocupada, use outro valor de `PORT` no `.env`.

## App no celular

```sh
pnpm install
pnpm --filter @mural/mobile start
```

Conecte o celular e o computador à mesma rede e abra o QR code no Expo Go. A tela inicial deve exibir **Mural**.

## Checagens

```sh
pnpm lint
pnpm typecheck
pnpm test
```

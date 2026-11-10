# Mural

App mobile de notas e tarefas para duas pessoas. No app você pode criar listas coloridas, salvar notas rápidas e organizar tarefas em checklists.

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

## App no celular com Expo Go

1. Siga os passos de desenvolvimento local da API acima e mantenha `pnpm api:dev` rodando em um terminal. O app precisa acessar a porta da API pela rede local.
2. Conecte o celular e o computador à mesma rede Wi-Fi. Em outro terminal, na raiz do projeto, copie o exemplo de configuração do app:

   ```sh
   cp -n apps/mobile/.env.example apps/mobile/.env
   ```

3. Em `apps/mobile/.env`, defina `EXPO_PUBLIC_API_URL` com o IP do computador e a porta da API, por exemplo `http://192.168.1.100:3333`. No navegador do celular, abra esse endereço com `/health` no final e confira se aparece `{"status":"ok"}`. Se a página não abrir, confira o IP, a porta e o acesso à porta pelo firewall do computador.
4. Inicie o Expo na raiz do projeto e escaneie o QR code no Android pelo Expo Go ou no iOS pela Câmera:

   ```sh
   pnpm --filter @mural/mobile start --go --lan
   ```

Na tela inicial, dê um nome à lista, escolha uma cor e toque em **Criar lista**. Abra a lista, adicione duas tarefas, toque no checkbox para marcar ou desmarcar e segure a alça **☰** para arrastar. Volte à home, escreva uma **Nota rápida**, escolha a lista de destino e salve. Abra a lista novamente para conferir a nota e a ordem das tarefas.

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

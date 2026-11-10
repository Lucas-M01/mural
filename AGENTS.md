# AGENTS.md — To Do Colaborativo

App pessoal de notas e tarefas (estilo Google Keep) para uso de duas pessoas, com listas privadas e compartilhadas, lembretes com horário e integração com Google Calendar. Também é projeto de portfólio: o código deve ser limpo, tipado e bem documentado.

## Regras para o agente

- Trabalhe **uma fase por vez** (ver "Plano de fases"). Não implemente nada de fases futuras.
- Antes de encerrar uma tarefa: rode `pnpm lint`, `pnpm typecheck` e `pnpm test`. Corrija o que quebrar.
- Ao concluir cada tarefa com lint, typecheck e testes passando, faça `git add` e `git commit` com mensagem Conventional Commits.
- TypeScript em modo `strict`. Proibido `any` (use `unknown` + validação).
- Nunca commite segredos. Toda configuração vem de variáveis de ambiente validadas na inicialização.
- Tokens do Google (access/refresh) são salvos **criptografados** (AES-256-GCM). Nunca em texto puro, nunca em logs.
- Commits pequenos, mensagens no padrão Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`).
- Se uma decisão não estiver neste arquivo, escolha a opção mais simples e registre em `docs/decisions.md`.
- Escreva testes para regras de negócio (services). Não precisa testar UI trivial.

## Stack

**Monorepo (pnpm workspaces)**

```
todo/
├── apps/
│   ├── api/        # Fastify 5 + TypeScript
│   └── mobile/     # React Native + Expo (TypeScript)
├── packages/
│   └── shared/     # tipos e schemas compartilhados (TypeBox)
├── docker-compose.yml
├── AGENTS.md
└── docs/
    └── decisions.md
```

**API (`apps/api`)**
- Node.js 20+ (LTS), Fastify 5, TypeScript
- Validação e tipos: TypeBox (`@fastify/type-provider-typebox`)
- Docs: `@fastify/swagger` + `@scalar/fastify-api-reference`
- Auth: login com Google → API emite JWT próprio (`@fastify/jwt`)
- Segurança: `@fastify/helmet`, `@fastify/cors` (origens explícitas), `@fastify/rate-limit`
- Banco: PostgreSQL + Prisma
- Tempo real: Socket.io (autenticado por JWT)
- Cache/presença: Redis
- Jobs: `node-cron` (lembretes) 
- Logs: pino (já vem no Fastify)
- Testes: Vitest + `fastify.inject()` + banco de teste via Docker

**Mobile (`apps/mobile`)**
- Expo (SDK atual), React Native, TypeScript, Expo Router
- Estilo: NativeWind
- Estado: Zustand (estado local) + TanStack Query (servidor)
- Offline: `expo-sqlite`
- Notificações: `expo-notifications`
- Login: `expo-auth-session` (Google)

**Infra**: Docker Compose (api + postgres + redis). Deploy final em Fly.io ou Railway.

## Modelo de dados (Prisma)

```prisma
model User {
  id               String   @id @default(uuid())
  googleId         String   @unique
  email            String   @unique
  name             String
  avatarUrl        String?
  expoPushToken    String?
  googleRefreshTokenEnc String?   // criptografado
  createdAt        DateTime @default(now())

  ownedLists  List[]       @relation("ListOwner")
  memberships ListMember[]
  createdTasks Task[]      @relation("TaskCreator")
  assignedTasks Task[]     @relation("TaskAssignee")
}

model List {
  id        String   @id @default(uuid())
  title     String
  color     String   @default("#FFFFFF")
  isShared  Boolean  @default(false)
  ownerId   String
  owner     User     @relation("ListOwner", fields: [ownerId], references: [id])
  members   ListMember[]
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ListMember {
  listId String
  userId String
  role   ListRole @default(MEMBER)
  list   List @relation(fields: [listId], references: [id], onDelete: Cascade)
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([listId, userId])
}

enum ListRole { OWNER MEMBER }

model Task {
  id            String    @id @default(uuid())
  listId        String
  title         String
  notes         String?
  isChecked     Boolean   @default(false)
  priority      Priority  @default(MEDIUM)
  position      Int       @default(0)       // ordenação drag-and-drop
  dueDate       DateTime?
  reminderAt    DateTime?
  googleEventId String?
  createdById   String
  assignedToId  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?                   // soft delete (necessário para sync offline)

  list       List  @relation(fields: [listId], references: [id], onDelete: Cascade)
  createdBy  User  @relation("TaskCreator", fields: [createdById], references: [id])
  assignedTo User? @relation("TaskAssignee", fields: [assignedToId], references: [id])

  @@index([listId, position])
}

enum Priority { LOW MEDIUM HIGH }
```

**Regra de acesso:** um usuário só enxerga/edita uma lista se existir registro em `ListMember` para ele. Listas privadas têm só o dono como membro. Toda query de lista/tarefa deve passar por essa checagem (centralizar em um helper `assertListAccess`).

## Rotas da API (`/api/v1`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/google` | Recebe `serverAuthCode`, troca por tokens no Google, cria/atualiza usuário, devolve JWT |
| GET | `/me` | Usuário atual |
| PUT | `/me/push-token` | Salva Expo push token |
| GET | `/lists` | Listas do usuário (próprias + compartilhadas) |
| POST | `/lists` | Cria lista |
| PATCH | `/lists/:id` | Edita título/cor |
| DELETE | `/lists/:id` | Remove (só dono) |
| POST | `/lists/:id/members` | Convida por e-mail (só dono) |
| DELETE | `/lists/:id/members/:userId` | Remove membro |
| GET | `/lists/:id/tasks` | Tarefas da lista (`?updatedSince=` para sync) |
| POST | `/lists/:id/tasks` | Cria tarefa |
| PATCH | `/tasks/:id` | Edita tarefa |
| PATCH | `/tasks/:id/toggle` | Marca/desmarca |
| PATCH | `/tasks/reorder` | Reordena (`[{id, position}]`) |
| DELETE | `/tasks/:id` | Soft delete |
| GET | `/health` | Healthcheck |

Padrão de erro: `{ "error": { "code": "STRING", "message": "texto" } }`. Nunca vazar stack trace em produção.

## Eventos Socket.io

- Handshake autenticado com o JWT (`auth.token`). Rejeitar conexão inválida.
- Cliente entra na room `list:{id}` apenas se tiver acesso à lista.
- Servidor emite: `task:created`, `task:updated`, `task:deleted`, `list:updated`, `presence:update`.
- Quem originou a mudança não recebe o próprio evento (`socket.to(room).emit`).

## Google OAuth e Calendar (decisão importante)

O app é mobile, então **não usar fluxo de redirect web** (`@fastify/oauth2` / Passport). Fluxo correto:

1. O app usa `expo-auth-session` com PKCE e escopos `openid profile email https://www.googleapis.com/auth/calendar.events`, pedindo acesso offline.
2. O app envia o `authorization code` para `POST /auth/google`.
3. A API troca o code por tokens com `google-auth-library` (guardar o `refresh_token` criptografado).
4. A API valida o ID token, cria/atualiza o `User` e responde com o JWT da aplicação.

Sync com o Calendar (**unidirecional**, app → Calendar):
- Tarefa com `dueDate` ou `reminderAt` cria evento no calendário `primary` de quem criou; guardar `googleEventId`.
- Editar a tarefa atualiza o evento; apagar remove o evento.
- Falha no Calendar **não pode** impedir salvar a tarefa: tratar em segundo plano e registrar o erro.
- Sync bidirecional está fora do escopo.

## Offline e sincronização (mobile)

- O app lê e escreve primeiro no SQLite local; a sincronização com a API acontece em segundo plano.
- Estratégia simples: fila de operações pendentes + `updatedSince` para baixar mudanças. Conflito = última escrita vence (`updatedAt`).
- Use `deletedAt` (soft delete) para propagar exclusões.

## Variáveis de ambiente (API)

```
NODE_ENV=development
PORT=3333
DATABASE_URL=postgresql://todo:todo@localhost:5432/todo
REDIS_URL=redis://localhost:6379
JWT_SECRET=
TOKEN_ENCRYPTION_KEY=        # 32 bytes em base64 (AES-256-GCM)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CORS_ORIGINS=http://localhost:8081
```

Manter um `.env.example` sempre atualizado. Validar tudo com TypeBox/`env-schema` ao subir.

## Plano de fases

Cada fase termina com: código funcionando, testes passando e README atualizado.

### Fase 0 — Setup
- Monorepo pnpm, ESLint, Prettier, `tsconfig` strict, scripts `lint`/`typecheck`/`test`.
- `docker-compose.yml` com Postgres e Redis.
- API Fastify mínima com `/health`, logs pino, Swagger/Scalar em `/docs`.
- App Expo criado e abrindo no celular.
- **Pronto quando:** `docker compose up` sobe a infra e `GET /health` responde 200.

### Fase 1 — Núcleo da API
- Prisma schema + migration inicial + seed.
- CRUD de listas e tarefas (sem auth ainda; usar usuário fixo de desenvolvimento via hook).
- `assertListAccess`, validação TypeBox, handler global de erros.
- Testes de services e de rotas com `inject()`.
- **Pronto quando:** todas as rotas de listas/tarefas têm teste e aparecem no Swagger.

### Fase 2 — App mobile (MVP usável)
- Telas: home com listas, tela da lista, nota rápida (campo na home), checklist com checkbox, cores por lista.
- Consumir a API com TanStack Query.
- Reordenar tarefas com drag-and-drop.
- **Pronto quando:** dá para criar lista, adicionar tarefas, marcar e reordenar pelo celular.

### Fase 3 — Auth com Google
- Fluxo descrito em "Google OAuth e Calendar".
- JWT guard (`fastify.authenticate`) em todas as rotas privadas; remover o usuário fixo.
- Tokens criptografados; `@fastify/rate-limit` na rota de login.
- Tela de login no app; token guardado em `expo-secure-store`.
- **Pronto quando:** duas contas Google diferentes conseguem logar e só veem as próprias listas.

### Fase 4 — Listas compartilhadas
- Convite por e-mail, `ListMember`, remoção de membros.
- Socket.io autenticado com rooms por lista e eventos de tarefa.
- Push via Expo quando o outro membro cria/conclui tarefa em lista compartilhada.
- **Pronto quando:** marcar uma tarefa no celular A aparece no celular B sem refresh.

### Fase 5 — Lembretes e Google Calendar
- Lembretes locais com `expo-notifications` (funcionam com app fechado).
- Job `node-cron` para lembretes de tarefas compartilhadas, se necessário.
- Sync unidirecional com o Calendar (criar/atualizar/remover evento).
- **Pronto quando:** tarefa com data e hora aparece no Google Calendar e notifica no horário.

### Fase 6 — Offline e polimento
- SQLite local + fila de sync + `updatedSince`.
- Busca local por título/notas, etiquetas/filtros.
- Presença online (Redis com TTL).
- README final com prints, diagrama de arquitetura e instruções de setup.
- Deploy da API e build do app (EAS).

## Fora do escopo (não implementar)

- Sync bidirecional com o Google Calendar.
- Login por e-mail/senha.
- Versão web.
- Mais de dois usuários por lista sem pedido explícito.

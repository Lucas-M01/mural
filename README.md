# Mural

App mobile de notas e tarefas para duas pessoas. No app você pode criar listas coloridas, salvar notas rápidas e organizar tarefas em checklists.

## Requisitos

- Node.js 24 LTS e pnpm 11.1.3
- Docker com o plugin Compose
- Celular Android ou iOS e uma conta Expo com acesso ao projeto EAS do Mural

## Google Cloud

1. No Google Auth Platform, configure a marca e a audiência do app. Se o projeto estiver em modo de teste, inclua as duas contas Google em **Test users**. Configure os escopos de identidade e `https://www.googleapis.com/auth/calendar.events` em **Data Access**. O login solicita o escopo do Calendar para obter autorização offline.
2. Crie um cliente OAuth **Web application** no mesmo projeto. Use o ID em `GOOGLE_CLIENT_ID` na API e em `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` no app. Guarde o segredo correspondente em `GOOGLE_CLIENT_SECRET` somente na API.
3. Para Android, crie um cliente OAuth **Android** com o package `com.todo.mural` de `apps/mobile/app.json` e o SHA-1 do certificado que assina o APK. Em `apps/mobile`, rode `eas credentials -p android` e selecione as credenciais do perfil **development** para consultar o SHA-1 do keystore. Também é possível ler o certificado do APK com `apksigner verify --print-certs caminho/do/app.apk`. Para um build distribuído pelo Google Play, cadastre também o SHA-1 do certificado de assinatura do app exibido no Play Console. Crie uma credencial Android por combinação de package e SHA-1.
4. Para iOS, crie um cliente OAuth **iOS** com o bundle identifier `com.todo.mural`. Informe esse ID em `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` no ambiente do build e no Metro. O `app.json` declara o plugin de Google Sign-In sem Firebase e o `app.config.js` gera o `iosUrlScheme` invertendo o ID iOS.

[Guia do Expo para autenticação Google](https://docs.expo.dev/guides/google-authentication/) · [Configuração do plugin sem Firebase](https://react-native-google-signin.github.io/docs/setting-up/expo)

## API e infraestrutura

Na raiz, copie `.env.example` para `.env`, preencha as credenciais Google e gere dois valores independentes com `openssl rand -base64 32` para `JWT_SECRET` e `TOKEN_ENCRYPTION_KEY`. Preserve a chave de criptografia enquanto houver refresh tokens no banco.

Para executar a pilha pelo Docker Compose, use `docker compose up --build --wait`. A API aplica as migrations ao iniciar e fica acessível pelo computador em [localhost:3333/docs](http://localhost:3333/docs/).

Para testar com um celular na rede local, execute a API com recarga automática. Se o contêiner da API estiver rodando, pare-o com `docker compose stop api` para liberar a porta.

```sh
docker compose up -d postgres redis
pnpm install
pnpm --filter @mural/api db:generate
pnpm --filter @mural/api db:migrate
pnpm api:dev
curl --fail http://localhost:3333/health
```

O healthcheck deve retornar HTTP 200 com `{"status":"ok"}`. Use HTTPS para a API fora da rede de desenvolvimento.

O app envia o `serverAuthCode` do Google a `POST /api/v1/auth/google` e recebe um JWT com validade de sete dias. `/api/v1/me` e as rotas de listas e tarefas exigem o JWT como Bearer. As listas da antiga conta de desenvolvimento continuam no banco vinculadas àquela conta.

## Development build via EAS

1. Instale o EAS CLI, autentique-se com `eas login` e confirme o acesso ao projeto definido em `apps/mobile/app.json`.
2. Copie `apps/mobile/.env.example` para `apps/mobile/.env` e preencha os IDs OAuth públicos. Configure `EXPO_PUBLIC_API_URL` com a URL base acessível ao celular, por exemplo `http://192.168.1.100:3333` na mesma rede Wi-Fi. Confira `/health` no navegador do celular. Cadastre as mesmas variáveis públicas no ambiente **development** do EAS se elas precisarem estar disponíveis no build remoto. O ID iOS é necessário para configurar o esquema de URL durante o build iOS.
3. Em `apps/mobile`, rode `eas build --profile development --platform android` ou `eas build --profile development --platform ios`. Para um dispositivo iOS físico, registre-o antes com `eas device:create`. Instale o binário gerado. Alterações no plugin ou no esquema iOS exigem um novo development build.
4. Na raiz do projeto, execute `pnpm --filter @mural/mobile start --dev-client --lan`. Abra o development build no celular e escaneie o QR code do Metro. O módulo nativo de Google Sign-In requer o development build.

[Como criar um development build com EAS](https://docs.expo.dev/develop/development-builds/create-a-build/)

## Validar o isolamento no celular

Entre com a primeira conta Google e crie uma lista chamada **Conta A** com uma tarefa. Toque em **Sair**, entre com a segunda conta e confirme que **Conta A** não aparece. Crie **Conta B**, saia e volte à primeira conta. Confirme que ela vê **Conta A** e a tarefa original, sem acesso a **Conta B**. Feche e reabra o app para conferir a restauração da sessão ativa pelo SecureStore.

## Design do app mobile

O visual usa como referência as telas em `stitch-export`. No modo escuro, os tokens de superfície e os acentos índigo vêm do sistema visual exportado. O app também acompanha o modo claro do sistema.

- **Painel** mostra o progresso geral das tarefas, atalhos para as listas e até cinco tarefas pendentes ordenadas por prioridade.
- **Listas** reúne cartões com o progresso de cada lista, criação de lista e nota rápida. Abra um cartão para editar a cor, marcar e reordenar tarefas.
- **Nova tarefa** permite escolher a lista, a descrição e a prioridade.
- **Perfil** mostra a conta Google ativa e permite sair.

Os tokens ficam em `apps/mobile/src/tokens.json` e são expostos como classes NativeWind. O desenvolvimento visual pode ser conferido no Android pelo development build.

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

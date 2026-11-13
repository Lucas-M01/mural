# Decisões

## Fase 0

- Node.js 24 LTS padroniza o ambiente local e o contêiner. O app usa Expo SDK 58 e Expo Router com uma única tela para verificar o setup no celular.
- O Compose inclui a API, o PostgreSQL e o Redis para permitir validar a instalação com um comando. As portas publicadas ficam restritas ao computador local.
- `/health` verifica se o processo HTTP está respondendo. O Compose verifica PostgreSQL e Redis separadamente, pois a API ainda não usa esses serviços.
- A API usa `tsx` para executar TypeScript localmente e no contêiner de desenvolvimento. Os schemas compartilhados são importados diretamente do workspace.
- A validação de ambiente cobre as variáveis usadas nesta fase. As credenciais de autenticação entram quando o fluxo correspondente for implementado.

## Fase 1

- A API usa Prisma 7 com o adaptador PostgreSQL. O seed cria um usuário fixo por ID e pode ser executado novamente. O hook de desenvolvimento usa esse mesmo ID e o processo recusa inicialização em produção.
- Uma lista nasce privada, com o dono associado como `OWNER` na mesma operação. Membros podem editar a lista. Só o dono pode excluí-la. Ausência de associação retorna 404 para evitar revelar registros de outros usuários.
- Novas tarefas vão para o fim da lista. Empates de posição usam o ID como segundo critério de ordenação. A reordenação aceita até 100 tarefas por lote, exige IDs distintos e aplica o lote em uma transação.
- A consulta padrão omite tarefas excluídas. Com `updatedSince`, retorna registros atualizados depois do instante informado, inclusive exclusões, identificadas por `deletedAt`. Excluir uma lista remove suas tarefas e associações em cascata.
- Os testes de services e rotas usam um PostgreSQL separado no Compose, em armazenamento temporário.

## Fase 2

- A nota rápida vira uma tarefa na lista escolhida na home. A primeira linha fornece o título e o texto completo fica no campo de notas.
- O app usa o endereço base de `EXPO_PUBLIC_API_URL` e acrescenta `/api/v1`. Para testar pela rede local, o celular acessa a API de desenvolvimento executada no computador.
- A reordenação preserva as posições existentes quando são distintas e envia apenas as posições que mudaram. Se um arraste exceder o limite de 100 alterações da API, o app restaura a ordem e pede um movimento menor.
- As requisições do app expiram após 8 segundos. Leituras repetem uma vez em falhas transitórias e mantêm o cache em memória visível. Escritas falham sem repetição automática, pois a API pode ter recebido a alteração antes de a conexão cair.
- O tema acompanha a aparência do sistema. As cores das listas são exibidas como marcadores em superfícies neutras, com os mesmos valores gravados pela API. Assim, o texto mantém contraste mesmo quando a lista tem uma cor personalizada.
- O checklist agrupa as tarefas por estado. O arraste reordena apenas as pendentes e, quando as posições são distintas, preserva as posições das concluídas. Apagar uma lista requer confirmação e usa a exclusão em cascata da API.

## Fase 3

- O login usa Google Sign-In nativo sem Firebase e compartilha o cliente OAuth Web entre o app e a API. No iOS, o config plugin recebe o esquema derivado do cliente iOS no ambiente do build.
- A API identifica a conta pelo `sub` verificado do Google e emite um JWT HS256 com validade de sete dias. O app volta ao login ao receber 401 e cria um cache de consultas para cada sessão.
- O refresh token usa AES-256-GCM com IV aleatório de 12 bytes e formato `v1.iv.tag.ciphertext`, com os três campos binários em base64. Se o Google omitir o refresh token em um login posterior, a API preserva o valor já salvo.
- A rota de login aceita até dez tentativas por minuto por IP da conexão. O escopo Calendar é solicitado durante o login para obter a autorização offline.

## Atualização visual baseada no Stitch

- O painel calcula o progresso geral pelas tarefas existentes. As listas exibem a proporção de tarefas concluídas e o perfil usa os dados de `/me`.
- A navegação inclui Painel, Listas e Perfil. O formulário de tarefa usa a prioridade que a API já aceita. Calendário, notificações e etiquetas seguem o plano de fases.

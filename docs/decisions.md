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

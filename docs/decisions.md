# Decisões

## Fase 0

- Node.js 24 LTS padroniza o ambiente local e o contêiner. O app usa Expo SDK 58 e Expo Router com uma única tela para verificar o setup no celular.
- O Compose inclui a API, o PostgreSQL e o Redis para permitir validar a instalação com um comando. As portas publicadas ficam restritas ao computador local.
- `/health` verifica se o processo HTTP está respondendo. O Compose verifica PostgreSQL e Redis separadamente, pois a API ainda não usa esses serviços.
- A API usa `tsx` para executar TypeScript localmente e no contêiner de desenvolvimento. Os schemas compartilhados são importados diretamente do workspace.
- A validação de ambiente cobre as variáveis usadas nesta fase. As credenciais de autenticação entram quando o fluxo correspondente for implementado.

# Simplificacao: biblioteca da equipe e runtime de clientes

## Fase unica - separar superficies e remover publicacao manual

Pedido atendido: a equipe usa somente telas mockadas padrao como biblioteca; cada cliente recebe somente o seu manifesto. A construcao e validacao ocorrem no repositorio pelo Codex, sem painel manual de publicacao.

Superficie: sidebar, configuracoes e contratos HTTP de configuracao.
Interacao preservada: navegacao e telas existentes; preferencias pessoais continuam opcionais e com fallback local.
Invariantes: nenhum modulo de tenant aparece/renderiza para equipe; Gelobel preserva Mensagens, Disparos no WhatsApp, Simuladores, Simulador de Combos e Configuracoes; versoes e snapshots permanecem como infraestrutura; nenhuma migration sera executada.
Nao objetivos: tela nova de draft/publicacao, historico visual, alteracao de conexoes ou dados.

- [x] Declarar biblioteca padrao da equipe com flags de visibilidade em codigo.
- [x] Impedir que runtime/API carreguem manifestos de tenant para usuarios da equipe.
- [x] Simplificar configuracoes da equipe e retirar painel/manual HTTP de publicacao.
- [x] Remover rota legada que publicava versao ao ordenar menu.
- [x] Validar build, contratos do runtime e smoke Gelobel sem migrations.

## Evidencias

- Preflight: nao existe `scripts/validate-phase.ps1` no workspace; validacao sera registrada por testes focados e build.
- Postflight (2026-07-27): `npm.cmd run build` aprovado; 34 testes focados aprovados, incluindo isolamento staff, preferencias pessoais, persistencia tecnica e smoke Gelobel. Nenhuma migration executada.

## Complemento - visibilidade direta por cliente

Mudanca posterior solicitada: painel da equipe para listar clientes e alternar, diretamente, a visibilidade de modulos e telas de cada manifesto publicado. Nao reintroduz draft, publicacao manual ou historico visual.

- [x] Expor contrato interno de leitura e alteracao de visibilidade por cliente.
- [x] Aplicar a visibilidade no runtime e na rota direta de telas.
- [x] Exibir painel de clientes, modulos e telas na configuracao da equipe.
- [x] Validar build e smoke Gelobel sem migrations.

Evidencia (2026-07-27): `npm.cmd run build` aprovado; 30 testes focados aprovados, incluindo ocultacao de tela Gelobel e bloqueio do runtime.

## Complemento - escala de usuarios e visoes

Pedido posterior: separar a gestao de usuarios da gestao de visoes e eliminar a gravacao concorrente no JSON do manifesto.

- [x] Separar a configuracao da equipe em `Usuarios e MASTERs` e `Clientes e visoes`.
- [x] Persistir override de visibilidade por cliente em tabela dedicada, indexada e auditavel.
- [x] Preservar compatibilidade de leitura com flags legadas existentes no JSON.
- [x] Validar build e contratos mockados; migration criada e nao executada por seguranca.

Evidencia (2026-07-27): `npm.cmd run build` aprovado; 34 testes focados aprovados. Migration `20260727100000_tenant_view_visibility.sql` aplicada e verificada no banco do projeto.

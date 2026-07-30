# Templates Visuais

Esta pasta guarda telas mockadas convertidas em templates reutilizaveis para clientes.

Regra central:
- o template preserva 100% da experiencia visual e interativa;
- adapters transformam dados mockados ou dados de tenant no formato do template;
- telas finais nao devem recriar graficos manualmente quando houver template equivalente.

## Estrutura Padrao

Cada tela deve seguir:

```text
nome-da-tela/
  README.md
  NomeDaTelaTemplate.tsx
  types.ts
  index.ts
  adapters/
    mockNomeDaTelaAdapter.ts
    tenantNomeDaTelaAdapter.ts
```

## Responsabilidades

- `Template.tsx`: somente layout, graficos, cards, tooltips e interacoes visuais.
- `types.ts`: contrato de dados normalizados consumidos pelo template.
- `adapters/mock*`: converte dados mockados atuais para o contrato.
- `adapters/tenant*`: converte dados reais do cliente para o contrato.
- `README.md`: documenta origem, widgets, filtros, requisitos e adaptacoes aceitas.

## Fluxo Para Novas Telas

1. Extrair visual da tela mockada para `Template.tsx`.
2. Criar `types.ts` com o menor contrato necessario.
3. Criar adapter mockado e manter a tela original funcionando.
4. Documentar a tela no `README.md`.
5. Criar adapter tenant somente depois do fit com o catalogo do cliente.


# Inventario Tecnico: Fase 1

## Decisao

O frontend atual sera preservado como camada visual. As regras criticas devem migrar gradualmente para o backend FastAPI.

## Pontos que precisam sair ou ser isolados no futuro

- `src/store/dashboardStore.tsx`
  - concentra dados mockados, filtros, permissoes, modulos, query engine e mutacoes;
  - risco: virar backend dentro do navegador;
  - destino: separar configuracao, permissao, dados e agregacao em servicos backend.

- `src/services/dashboardData.ts`
  - possui fallback para mock;
  - risco: mascarar erro real de API em producao;
  - destino: fallback permitido somente em desenvolvimento controlado.

- `src/components/shared/AskAIDrawer.tsx`
  - cria e remove modulos no front;
  - risco: cliente alterar estrutura sem validacao/publicacao;
  - destino: ferramenta interna com versao, validacao e auditoria.

- `src/services/openaiService.ts`
  - chamada OpenAI fica no navegador;
  - risco: exposicao de chave e regra sensivel no cliente;
  - destino: backend interno, fora do fluxo do cliente final.

- `src/features/cadastros/views/DynamicCanvasView.tsx`
  - deve ser mantido como renderizador configuravel;
  - ajuste futuro: receber datasets prontos e parar de calcular regra local.

- `src/components/shared/DynamicChart.tsx`
  - renderizador visual bom;
  - ajuste futuro: desacoplar de `queryWorkspaceData` e aceitar dataset vindo do backend.

## O que nao deve ser feito

- Criar pagina React por cliente.
- Aceitar `schema_name`, `table_name` ou SQL vindos do frontend.
- Conectar Supabase antes da modelagem da Fase 2.
- Permitir IA no fluxo final sem validacao humana.


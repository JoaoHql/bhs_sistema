# Log de execucao - Fase 3 Projecao de Vendas Gelobel

## 2026-08-10 - Tabela sem footer de expansao e uma linha por dia

Escopo:

- Confirmada a remocao dos botoes `Expandir View Report para 15/30` e `Restaurar Padrao` do footer.
- Mantidos no header o seletor de linhas visiveis, exportacao CSV, configuracao de colunas, ordenacao e redimensionamento.
- Confirmada deduplicacao defensiva no adapter por `sales_date`.
- Confirmada normalizacao defensiva no backend para respostas duplicadas por data.
- Confirmado uso de `key={row.date}` na tabela e exportacao baseada em `sortedRows`.
- Atualizado o plano com os criterios comprovados e a pendencia de validacao autenticada em agosto.

Arquivos alterados:

- `plans/PLANO_CORRECAO_PROJECAO_VENDAS_GELOBEL.md`
- `plans/logs_projecao_vendas_gelobel/FASE_3_EXECUCAO.md`

Validacao:

- `npm run build` — OK (`tsc -b` e `vite build`).
- `python -m pytest backend/tests/test_query_api.py backend/tests/test_query_service.py` — 12 passed.
- `python -m py_compile backend/app/repositories/query_repository.py` — OK.
- Busca dos textos dos botoes removidos no template — nenhuma ocorrencia encontrada.
- Confirmacao interativa da API para agosto-2026 com Todas as empresas e uma empresa permanece pendente sem sessao autenticada Gelobel; nao houve deploy nem acesso a infraestrutura externa.

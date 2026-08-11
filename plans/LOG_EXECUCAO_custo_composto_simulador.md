# Log de execucao - custo composto compprod no Simulador

## 2026-08-06 - Implementacao do custo composto via compprod (v2: soma + remocao custo_medio)

Escopo:

- Formula final: `unit_cost = preco_custo + SUM(qtd × preco_custo dos componentes)`
- Produto sem composicao: `unit_cost = preco_custo` direto
- Deteccao automatica da tabela `compprod` via `to_regclass`
- Remocao completa de `custo_medio` e `data_custo` do schema, scripts e documentacao

Arquivos alterados:

- `backend/app/repositories/query_repository.py` — metodo `fetch_combo_products`: soma em vez de COALESCE
- `integracao_supa/load_simulador_catalogo.py` — removido `load_latest_costs`, colunas `custo_medio` e `data_custo` do COPY
- `integracao_supa/load_gelobel_produtos.py` — removida referencia a `custo_medio` no relatorio final
- `supabase/migrations/20260806150000_remove_custo_medio_simulador.sql` — drop `custo_medio`, `data_custo`; recria `vw_simulador_produtos` e `custos`
- `operacional/catalogos_tenants/gelobel.md` — atualizada descricao da fonte de custo

Validacao:

- Sem diagnostico de erro (LSP limpo)
- Frontend sem alteracoes: o campo `unit_cost` flui via `gelobelComboSimulatorAdapter.ts` sem mudancas
- Smoke test do Gelobel pendente (requer backend rodando com acesso ao Supabase)

Pendencias:

- Rodar smoke test do Gelobel para confirmar que `Simuladores` e `Simulador de Combos` carregam
- Validar query manual no banco para um produto com composicao conhecida (ex: produto_id=1)

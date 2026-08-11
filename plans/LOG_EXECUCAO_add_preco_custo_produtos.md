# Log de execucao - Adicionar preco_custo do MySQL produtos no Supabase

## 2026-08-06 - Migration + atualizacao dos 3 scripts de carga

Escopo:

- Criada migration `20260806130000_add_preco_custo_produtos.sql`: altera `simulador_produtos` adicionando `preco_custo numeric(15,4) not null default 0` e recria as views `produtos` e `vw_simulador_produtos`
- `load_gelobel_mysql.py`: `sync_produtos()` — adicionado `preco_custo` no INSERT, SELECT e ON CONFLICT UPDATE
- `load_gelobel_data.py`: `create_staging_tables`, `stage_produtos`, `merge_staged_data` — adicionado `preco_custo` nos 3 pontos; `apply_schema` migrada para `MIGRATION_PATHS` (tuple com 2 migrations)
- `load_simulador_catalogo.py`: `load_products()`, COPY e `write_row` — adicionado `preco_custo`; `MIGRATION_PATH` migrada para `MIGRATION_PATHS` (tuple com 2 migrations)
- `gelobel.md`: documentado novo campo `preco_custo` na tabela de campos

Arquivos alterados:

- `supabase/migrations/20260806130000_add_preco_custo_produtos.sql` (criado)
- `integracao_supa/load_gelobel_mysql.py` (sync_produtos + MIGRATIONS)
- `integracao_supa/load_gelobel_data.py` (staging + stage + merge + MIGRATION_PATHS + apply_schema)
- `integracao_supa/load_simulador_catalogo.py` (load_products + COPY + MIGRATION_PATHS)
- `operacional/catalogos_tenants/gelobel.md` (documentacao)

Validacao:

- `python -m py_compile` passou nos 3 scripts alterados
- Backend e frontend inalterados (campo fica so no banco)

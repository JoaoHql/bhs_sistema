# Log de execucao - Unificar integracao MySQL↔Supabase em integracao_supa/

## 2026-08-06 - Movimentacao de 9 arquivos para integracao_supa/

Escopo:

- Criada pasta `integracao_supa/` com `__init__.py`
- Adicionada funcao `carregar_config_local()` em `teste_mysql.py` (bug latente resolvido)
- Ajustados `ROOT = parents[1]` em `exportar_schema_mysql.py` e `exportar_projecao_vendas_detalhada.py`
- Corrigidos imports para `from integracao_supa.teste_mysql` nos scripts de carga
- Movidos 8 scripts Python + `.env` de `ops/` e raiz para `integracao_supa/`
- Atualizadas 5 referencias externas (AGENTS.md, docs/MULTI_TENANT.md, skill load-gelobel-data, taste/workflow, settings.json)
- Removidos 4 `.pyc` orfaos de `ops/__pycache__/`

Arquivos alterados:

- `integracao_supa/__init__.py` (criado)
- `integracao_supa/teste_mysql.py` (movido + editado)
- `integracao_supa/exportar_schema_mysql.py` (movido + editado)
- `integracao_supa/exportar_projecao_vendas_detalhada.py` (movido + editado)
- `integracao_supa/load_gelobel_data.py` (movido)
- `integracao_supa/load_gelobel_mysql.py` (movido + editado)
- `integracao_supa/load_gelobel_projecao_vendas.py` (movido + editado)
- `integracao_supa/load_gelobel_projecao_vendas_detalhada.py` (movido + editado)
- `integracao_supa/load_simulador_catalogo.py` (movido)
- `integracao_supa/.env` (movido)
- `AGENTS.md` (linha 11)
- `docs/MULTI_TENANT.md` (linha 54)
- `.commandcode/skills/load-gelobel-data/SKILL.md` (linha 18)
- `.commandcode/taste/workflow/taste.md` (linha 17)
- `.commandcode/settings.json` (linha 11)

Validacao:

- `python -m py_compile` passou para todos os 8 scripts em `integracao_supa/`
- `ops/` mantem apenas scripts operacionais (smoke, verify, migrate, configure, seed)
- `disparos.py` permanece na raiz (sem relacao com MySQL/CSV)

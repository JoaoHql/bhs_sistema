# Log de execucao - projecao de vendas com 5 dias

## 2026-08-10 - Restauracao do padrao de carga

Escopo:

- Restaurado o padrao de `days-back` do loader de projecao de vendas para 5 dias.
- Mantido o comportamento de carregar todos os registros quando `--days-back 0` for informado.
- Enviado o loader atualizado para a VPS.

Arquivos alterados:

- `integracao_supa/load_gelobel_projecao_vendas.py`
- `plans/LOG_EXECUCAO_PROJECAO_5_DIAS.md`

Validacao:

- `python -m py_compile integracao_supa/load_gelobel_projecao_vendas.py` passou.
- `git diff --check` passou.
- Arquivo confirmado na VPS com `default=5`.
- PM2 permaneceu parado após a falha anterior; nenhuma nova carga foi iniciada nesta etapa.

Pendencias:

- A carga anterior falhou na validacao porque a origem retornou 26 registros e o destino retornou 32 no periodo filtrado.
- O PM2 precisa ser reiniciado somente após corrigir e validar essa divergencia.

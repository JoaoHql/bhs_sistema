# Log de execucao - correcao do loader de projecao de vendas

## 2026-08-10 - Sincronizacao do recorte carregado

Escopo:

- Corrigido `integracao_supa/load_gelobel_projecao_vendas.py` para remover do destino os registros do recorte carregado antes de inserir os registros atuais do MySQL.
- Mantida a preservacao de dados anteriores ao `cutoff_date` quando `--days-back` e maior que zero.
- Mantida a limpeza completa quando `--days-back 0` solicita o historico completo.
- Atualizados os calculos de `adicionados`, `atualizados` e `apagados` para refletir as chaves do recorte antes da substituicao.
- Atualizada a ajuda do argumento `--days-back` para informar o padrao atual de 725 dias.

Arquivos alterados:

- `integracao_supa/load_gelobel_projecao_vendas.py`
- `plans/LOG_EXECUCAO_correcao_loader_projecao_vendas.md`

Validacao:

- `C:\Python314\python.exe -m py_compile integracao_supa\\load_gelobel_projecao_vendas.py` concluido sem erro.
- Diff revisado; a exclusao e limitada ao recorte selecionado e ocorre na mesma transacao da carga.
- Teste isolado da funcao `load()` concluido: removeu 1 registro obsoleto, atualizou 1, adicionou 1 e preservou 1 registro anterior ao corte.
- Nenhuma carga, migration, consulta de banco ou deploy foi executado nesta correcao.
- Pendencia: executar o loader explicitamente para sincronizar o Supabase e confirmar a validacao dos totais.

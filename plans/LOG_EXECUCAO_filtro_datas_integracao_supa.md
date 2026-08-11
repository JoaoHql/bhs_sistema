# Log de Execucao: Filtro de Datas (--days-back) e PM2 06:00

- **Data ISO**: 2026-08-07T16:45:00-03:00
- **Escopo executado**:
  - Adicionado suporte a `--days-back` (padrão 5 dias, configurável) em `load_gelobel_projecao_vendas.py` e `load_gelobel_projecao_vendas_detalhada.py`.
  - Atualizada a query MySQL para buscar apenas registros a partir da data de corte (`Data >= cutoff_date`).
  - Em `load_gelobel_projecao_vendas_detalhada.py`, adicionada limpeza (`DELETE FROM tenant_gelobel.projecao_vendas_detalhada WHERE data_venda >= cutoff_date`) antes de inserir os lotes de 1.000 para evitar duplicação no re-envio do período.
  - Atualizadas as queries de validação de destino no Supabase para checar a contagem/soma da mesma janela retroativa.
  - Atualizado o orquestrador `run_pipeline.py` para aceitar `--days-back` e repassar automaticamente aos passos de vendas.
  - Atualizado `ecosystem.config.js` para rodar o agendamento PM2 diariamente às **06:00** (`0 6 * * *`).
  - Documentação atualizada em `docs/INTEGRACAO_PM2_VPS.md`.

- **Arquivos alterados**:
  - `integracao_supa/load_gelobel_projecao_vendas.py`
  - `integracao_supa/load_gelobel_projecao_vendas_detalhada.py`
  - `integracao_supa/run_pipeline.py`
  - `integracao_supa/ecosystem.config.js`
  - `docs/INTEGRACAO_PM2_VPS.md`

- **Validação**:
  - `python integracao_supa/load_gelobel_projecao_vendas.py --help` (Sucesso)
  - `python integracao_supa/load_gelobel_projecao_vendas_detalhada.py --help` (Sucesso)
  - `python integracao_supa/run_pipeline.py --help` (Sucesso)

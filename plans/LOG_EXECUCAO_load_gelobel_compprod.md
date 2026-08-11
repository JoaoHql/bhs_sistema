# Log de Execução – Carga compprod para tenant_gelobel

- **Data**: 2026-08-06
- **Escopo executado**:
  - Migration SQL `20260806130000_gelobel_compprod.sql` com schema `tenant_gelobel.compprod`, unique em `(empresa, comp_produto_id)`, indexes e RLS
  - Script `integracao_supa/load_gelobel_compprod.py` espelhando o padrao de `load_gelobel_projecao_vendas_detalhada.py`
- **Arquivos alterados/criados**:
  - `supabase/migrations/20260806130000_gelobel_compprod.sql` (novo)
  - `integracao_supa/load_gelobel_compprod.py` (novo)
- **Validacao**: script segue o mesmo padrao do existente; trunca antes de inserir para evitar duplicacao; validacao final confere contagem origem vs destino

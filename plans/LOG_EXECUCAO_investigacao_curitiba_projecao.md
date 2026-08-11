# Log de execucao - investigacao Curitiba na projecao de vendas

## 2026-08-10 - Diagnostico da empresa ausente

Escopo:

- Rastreamento da origem MySQL, carga para Supabase, consulta backend e filtros da tela de Projecao de Vendas.
- Verificacao do script `integracao_supa/load_gelobel_projecao_vendas.py`, especialmente a selecao da origem e a validacao do destino.
- Verificacao de `backend/app/repositories/query_repository.py` e `backend/app/api/v1/endpoints/query.py` para a montagem de `companies`.
- Verificacao de `src/features/vendas/views/SalesProjectionTenantView.tsx` e `src/services/queryApi.ts` para o envio do filtro `company`.
- Consulta somente leitura na origem MySQL: empresas encontradas em `projecao_vendas` foram Aurora, Boulevard, Catuai, Dom Pablo e Eventos; nenhuma linha correspondeu a Curitiba.
- Consulta somente leitura na origem MySQL: empresas encontradas em `projecao_vendas_detalhada` foram Aurora, Boulevard, Catuai, Dom Pablo e Eventos; nenhuma linha correspondeu a Curitiba.
- Consulta somente leitura no Supabase: `tenant_gelobel.projecao_vendas_diaria` possui as mesmas cinco empresas; nenhuma linha correspondeu a Curitiba.

Arquivos alterados:

- `plans/LOG_EXECUCAO_investigacao_curitiba_projecao.md`

Validacao:

- Consultas MySQL executadas em primeiro plano e concluidas sem erro.
- Consultas Supabase executadas em primeiro plano e concluidas sem erro.
- Nenhuma carga, migration, deploy ou alteracao de dados foi executada.
- Conclusao: a ausencia de Curitiba nao e causada por filtro do frontend ou pela linha 145 do loader; a empresa nao existe nas tabelas de origem da projecao e, por isso, nao chega ao destino nem ao seletor `response.companies`.
- Pendencia: cadastrar/importar registros de Curitiba na origem correta e executar a carga historica apropriada, caso a empresa deva participar desta tela.

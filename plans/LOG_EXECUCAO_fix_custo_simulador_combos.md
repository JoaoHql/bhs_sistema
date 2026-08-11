# Log de execucao - Fix Custo Incorreto no Simulador de Combos

## 2026-08-06 - Correcao de dados e mismatch de empresa no calculo de custo

Escopo:

- Diagnosticado custo incorreto no Simulador de Combos para produto 48 (Frango a Passarinho com Alho - AURORA): mostrava ~6,17, calculo real da epoca dava ~6,18
- Causas identificadas:
  1. **Dados dessincronizados**: `simulador_produtos.preco_custo` com valores diferentes do CSV fonte `produtos.csv` (ex: componente 478 Aurora tinha 7,67 no banco vs 9,61 no CSV)
  2. **Mismatch de empresa**: `compprod` tinha "Dom Pablo" mas `simulador_produtos` tem "Dom" (normalizado pelo `load_simulador_catalogo.py`). O JOIN `ON empresa` na query SQL quebrava, retornando `custo_calculado = NULL` para Dom (e outros tenants afetados)
- **Terceiro achado colateral**: script `load_gelobel_compprod.py` fazia INSERT por linha (~14k registros), causando timeout de 10 minutos. Reescrevi com `COPY` para carga em segundos

Arquivos alterados:

- `integracao_supa/load_gelobel_compprod.py` — adicionado `normalize_empresa()` (Dom Pablo → Dom) e reescrita da funcao `load()` de INSERT linha-a-linha para COPY bulk
- `bases_gelobel/produtos.csv` — nao alterado (fonte)
- Banco Supabase: `tenant_gelobel.simulador_produtos` recarregado via `load_simulador_catalogo.py`, `tenant_gelobel.compprod` recarregado via `load_gelobel_compprod.py`

Validacao:

- `simulador_produtos` recarregado: 11267 produtos (CSV)
- `compprod` recarregado: 14014 registros (MySQL) com normalizacao de empresa
- Custo calculado produto 48 Aurora: **7,728** (0,8 × 9,61 + 0,05 × 0 + 1,0 × 0,04)
- Dom (produto 48): **6,176** (antes era NULL — JOIN quebrado corrigido)
- Todos os 7 tenants agora tem `custo_calculado` preenchido corretamente

Pendencias:

- O usuario mencionou esperar 9,30 como preco_custo do componente 478 Aurora, mas o CSV fonte tem 9,61 e o MySQL tem 7,67. Nenhuma fonte conhecida tem 9,30. A confirmar se o valor correto eh realmente 9,30 e de onde ele viria.

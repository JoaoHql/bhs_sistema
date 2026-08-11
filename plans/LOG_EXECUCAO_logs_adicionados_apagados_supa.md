# Log de Execução: Logs de Registros Adicionados e Apagados no Supabase

- **Data**: 2026-08-10
- **Escopo Executado**:
  - Inclusão de cálculo e logs explícitos de registros adicionados e apagados do Supabase em todos os scripts de carga da pasta `integracao_supa/`.
  - Configuração do `setup_file_logger` em todos os arquivos de load para garantir que as mensagens sejam impressas no terminal e salvas nos arquivos de log `.txt`.
- **Arquivos Alterados**:
  - `integracao_supa/load_gelobel_compprod.py`
  - `integracao_supa/load_gelobel_produtos.py`
  - `integracao_supa/load_gelobel_projecao_vendas.py`
  - `integracao_supa/load_gelobel_projecao_vendas_detalhada.py`
  - `integracao_supa/load_simulador_catalogo.py`
- **Validação**:
  - Execução validada em primeiro plano com `python integracao_supa/load_simulador_catalogo.py --apply-schema`.
  - Verificada a saída de log no stdout e no arquivo `log_catalogo.txt`: `Carga concluida: 11267 registros adicionados, 11271 registros apagados (total final: 11267).`

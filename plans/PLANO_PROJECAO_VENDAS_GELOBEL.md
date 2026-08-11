# Plano: Projeção de Vendas — Gelobel

Status: em execução.

Superfície: `Gestão (BI) > Projeção de Vendas`.

Interação: filtros globais de mês e empresa; três cenários alteram tabela e velocímetros juntos.

Invariantes: cálculos existentes, rota `projecao-vendas`, permissões, dados carregados e demais módulos Gelobel.

Fora de escopo: gráfico adicional, persistência de cenários e alteração de dados no banco.

## Fase 1 — Navegação no módulo Gestão (BI)

- [x] Mover a tela publicada para `Gestão (BI)` sem alterar ID, rota ou permissões.

Critério de aceite:

- [x] A tela permanece acessível em `Gestão (BI)`.

## Fase 2 — Cabeçalho, filtros e cenários

Origem: pedido aprovado para estruturar a tela de Projeção de Vendas no módulo Gestão (BI).

- [x] Extrair o visual da projeção para template reutilizável com contrato normalizado e adapters mockado/Gelobel.
- [x] Manter filtros globais: Mês (`data_venda`) e Empresa (`empresa`), com opções reais da API.
- [x] Manter três controles internos: crescimento de quantidade, ticket médio e meta.
- [x] Garantir que alteração de cenário reflita nos dados mais recentes, sem resposta antiga sobrescrever a atual.
- [x] Manter os três velocímetros e a tabela diária na mesma superfície, sem alterar fórmulas.

Critérios de aceite:

- [x] Filtros e cenários atualizam os valores exibidos juntos.
- [x] Tela preserva loading, erro e ausência de meta sem perder a estrutura.
- [x] Build frontend passa.
- [x] Smoke Gelobel preserva Mensagens, Disparos no WhatsApp, Simuladores, Simulador de Combos e Configurações.

## Fase 3 — Validação operacional autenticada

Origem: necessidade técnica indispensável para disponibilizar a tela no acesso real do cliente.

- [x] Validar o acesso MASTER Gelobel à tela publicada em `Gestão (BI)`.
- [x] Alterar Mês e Empresa usando opções reais e confirmar a atualização da tabela e dos três velocímetros.
- [x] Alterar cada cenário e confirmar que quantidade, faturamento e meta atualizam juntos.
- [x] Recarregar a página e confirmar que navegação e filtros publicados permanecem disponíveis.

Critérios de aceite:

- [x] Não há erro no console da tela.
- [x] Nenhum módulo ou tela Gelobel existente desaparece após a validação.

## Fase 4 — Projeção de quantidade por dia equivalente

Origem: pedido para que `Qtd. Proj Vendas` use a média dos quatro dias anteriores com o mesmo dia da semana.

- [x] Para cada data, buscar os quatro dias anteriores com o mesmo dia da semana, respeitando o filtro de Empresa.
- [x] Projetar a quantidade pela média desses quatro dias e aplicar o cenário de crescimento de quantidade.
- [x] Retornar projeção e percentual de quantidade como ausentes quando não existirem quatro referências históricas.
- [x] Preservar os demais cálculos, filtros, rota e superfície da tela.

Critérios de aceite:

- [x] Uma quinta-feira, por exemplo, é calculada somente a partir das quatro quintas-feiras anteriores.
- [x] A tabela, exportação CSV e velocímetro de quantidade tratam ausência de projeção sem exibir zero artificial.
- [x] Testes backend e build frontend passam.

## Fase 5 — Projeção de faturamento por dia equivalente

Origem: pedido para aplicar ao `R$ Projetado` a mesma lógica de quatro dias anteriores com o mesmo dia da semana.

- [x] Para cada data, calcular a média do faturamento dos quatro dias anteriores equivalentes, respeitando Empresa.
- [x] Aplicar o cenário de ticket médio sobre essa média para formar `R$ Projetado` e seu percentual realizado.
- [x] Retornar faturamento projetado e percentual como ausentes sem quatro referências históricas.
- [x] Preservar cálculo de quantidade, meta, filtros, rota e superfície da tela.

Critérios de aceite:

- [x] Uma quinta-feira usa exclusivamente as quatro quintas-feiras anteriores para o faturamento projetado.
- [x] Tabela, CSV e velocímetro de faturamento não exibem zero artificial na ausência de projeção.
- [x] Testes backend e build frontend passam.

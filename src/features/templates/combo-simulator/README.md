# Template: Simulador De Combos

Origem visual:
- `src/features/simuladores/components/CombosSimulatorTab.tsx`

Contrato:
- `ComboSimulationData` recebe catalogo, tres produtos iniciais, chave de armazenamento e busca remota opcional.

Adapters:
- `mockComboSimulatorAdapter.ts`: preserva a tela mockada.
- `gelobelComboSimulatorAdapter.ts`: converte `produtos` e o ultimo custo valido em opcoes normalizadas.

Regra:
- O template preserva visual, calculos, historico local, exportacao e seletor pesquisavel.
- Nenhum nome fisico do schema tenant pode existir no template.

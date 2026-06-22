import React, { useMemo, useState } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  CircleDollarSign,
  Gauge,
  MinusCircle,
  PieChart,
  Sigma,
  TrendingUp,
  X,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type DreKind = 'positive' | 'deduction' | 'subtotal' | 'cost' | 'expense' | 'result';

interface DreLine {
  id: string;
  parentId?: string;
  label: string;
  kind: DreKind;
  level: number;
  icon: React.ElementType;
  values: number[];
}

const baseRevenue = [1820000, 1950000, 2020000, 2140000, 2260000, 2380000, 2460000, 2510000, 2630000, 2760000, 2880000, 3050000];

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const subtract = (a: number[], b: number[]) => a.map((value, index) => value - b[index]);

const percentOf = (base: number[], rate: number) => base.map(value => value * rate);

const rowClasses: Record<DreKind, string> = {
  positive: 'bg-white text-slate-700',
  deduction: 'bg-rose-50/50 text-rose-700',
  subtotal: 'bg-blue-50 text-blue-800 font-extrabold',
  cost: 'bg-amber-50/60 text-amber-800',
  expense: 'bg-slate-50 text-slate-700',
  result: 'bg-emerald-50 text-emerald-800 font-extrabold',
};

const iconClasses: Record<DreKind, string> = {
  positive: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  deduction: 'text-rose-600 bg-rose-50 border-rose-100',
  subtotal: 'text-blue-600 bg-blue-50 border-blue-100',
  cost: 'text-amber-600 bg-amber-50 border-amber-100',
  expense: 'text-slate-600 bg-slate-100 border-slate-200',
  result: 'text-emerald-700 bg-emerald-100 border-emerald-200',
};

const formatBRL = (val: number) => (
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)
);

const formatShort = (val: number) => {
  const abs = Math.abs(val);
  const prefix = val < 0 ? '-' : '';
  if (abs >= 1000000) return `${prefix}R$ ${(abs / 1000000).toFixed(1)}M`;
  return `${prefix}R$ ${(abs / 1000).toFixed(0)}k`;
};

const formatPct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

interface SankeyNode {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: number;
  fill: string;
}

const SankeyFlow: React.FC<{
  receita: number;
  deducoes: number;
  custos: number;
  despesas: number;
  lucro: number;
  onNodeClick: (nodeKey: string) => void;
}> = ({ receita, deducoes, custos, despesas, lucro, onNodeClick }) => {
  const max = receita;
  const widthFor = (value: number) => Math.max(10, Math.abs(value) / max * 64);

  const nodes: SankeyNode[] = [
    { key: 'receita', x: 30, y: 124, w: 116, h: 68, label: 'Receita Bruta', value: receita, fill: '#10b981' },
    { key: 'deducoes', x: 250, y: 26, w: 112, h: 64, label: 'Deducoes', value: deducoes, fill: '#f43f5e' },
    { key: 'receitaLiquida', x: 250, y: 124, w: 120, h: 68, label: 'Receita Liquida', value: receita - deducoes, fill: '#3b82f6' },
    { key: 'custos', x: 474, y: 26, w: 102, h: 64, label: 'Custos', value: custos, fill: '#f59e0b' },
    { key: 'lucroBruto', x: 474, y: 124, w: 106, h: 68, label: 'Lucro Bruto', value: receita - deducoes - custos, fill: '#14b8a6' },
    { key: 'despesas', x: 690, y: 26, w: 112, h: 64, label: 'Despesas', value: despesas, fill: '#64748b' },
    { key: 'lucroLiquido', x: 690, y: 124, w: 112, h: 68, label: 'Lucro Liquido', value: lucro, fill: '#059669' },
  ];

  const links = [
    { d: 'M146 148 C190 148 198 58 250 58', value: deducoes, color: '#fb7185' },
    { d: 'M146 158 C188 158 205 158 250 158', value: receita - deducoes, color: '#60a5fa' },
    { d: 'M370 148 C414 148 424 58 474 58', value: custos, color: '#fbbf24' },
    { d: 'M370 164 C414 164 424 164 474 164', value: receita - deducoes - custos, color: '#2dd4bf' },
    { d: 'M580 148 C624 148 636 58 690 58', value: despesas, color: '#94a3b8' },
    { d: 'M580 164 C624 164 636 164 690 164', value: lucro, color: '#34d399' },
  ];

  return (
    <svg viewBox="0 0 830 232" className="w-full h-full" role="img" aria-label="Fluxo DRE Sankey">
      <rect x="0" y="0" width="830" height="232" rx="8" fill="#f8fafc" />
      {links.map(link => (
        <path
          key={link.d}
          d={link.d}
          fill="none"
          stroke={link.color}
          strokeWidth={widthFor(link.value)}
          strokeLinecap="round"
          opacity="0.38"
        />
      ))}
      {nodes.map(node => (
        <g
          key={node.key}
          onClick={() => onNodeClick(node.key)}
          className="cursor-pointer group"
          tabIndex={0}
          role="button"
          aria-label={`Detalhar ${node.label}`}
        >
          <rect 
            x={node.x} 
            y={node.y} 
            width={node.w} 
            height={node.h} 
            rx="8" 
            fill="white" 
            stroke="#e2e8f0" 
            className="group-hover:stroke-blue-400 group-hover:fill-slate-50/50 transition-colors duration-200"
          />
          <rect x={node.x} y={node.y} width="5" height={node.h} rx="4" fill={node.fill} />
          <text x={node.x + 14} y={node.y + 18} fontSize="11" fontWeight="800" fill="#334155">{node.label}</text>
          <text x={node.x + 14} y={node.y + 36} fontSize="12" fontWeight="900" fill="#0f172a">{formatShort(node.value)}</text>
          <text 
            x={node.x + 14} 
            y={node.y + node.h - 8} 
            fontSize="8" 
            fontWeight="800" 
            className="fill-slate-400 group-hover:fill-blue-600 transition-colors duration-200"
          >
            Clique para detalhar
          </text>
        </g>
      ))}
    </svg>
  );
};

export const DRETab: React.FC = () => {
  const { branch } = useDashboard();
  const [selectedSankeyNode, setSelectedSankeyNode] = useState<string | null>(null);

  // Collapse/Expand state (all level 0 expanded by default)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    'receita_bruta': true,
    'devolucoes_cancelamentos': true,
    'custos_operacionais': true,
    'despesas_operacionais': true,
    'depreciacao_amortizacao': true,
    'resultado_financeiro': true,
    'provisao_ircs': true,
  });

  // Sorting state
  const [sortState, setSortState] = useState<{
    column: 'label' | 'total' | number | null;
    measure: 'value' | 'av' | 'ah';
    direction: 'asc' | 'desc' | null;
  }>({
    column: null,
    measure: 'value',
    direction: null,
  });

  const data = useMemo(() => {
    const branchFactor = branch === 'Filial Sul' ? 0.34 : branch === 'Filial Sudeste' ? 0.42 : branch === 'Filial Nordeste' ? 0.24 : 1;
    const receitaBruta = baseRevenue.map(value => value * branchFactor);
    const devolucoes = percentOf(receitaBruta, 0.024);
    const impostos = percentOf(receitaBruta, 0.112);
    const receitaLiquida = subtract(subtract(receitaBruta, devolucoes), impostos);
    const cmv = percentOf(receitaLiquida, 0.438);
    const lucroBruto = subtract(receitaLiquida, cmv);
    const despesasComerciais = percentOf(receitaLiquida, 0.118);
    const despesasAdm = percentOf(receitaLiquida, 0.092);
    const marketing = percentOf(receitaLiquida, 0.041);
    const ebitda = receitaLiquida.map((value, index) => value - cmv[index] - despesasComerciais[index] - despesasAdm[index] - marketing[index]);
    const depreciacao = percentOf(receitaLiquida, 0.019);
    const ebit = subtract(ebitda, depreciacao);
    const resultadoFinanceiro = percentOf(receitaLiquida, -0.013);
    const lucroAntesIr = ebit.map((value, index) => value + resultadoFinanceiro[index]);
    const ircs = percentOf(lucroAntesIr, 0.17);
    const lucroLiquido = subtract(lucroAntesIr, ircs);

    const lines: DreLine[] = [
      // 1. Receita Bruta (Level 0)
      { id: 'receita_bruta', label: 'Receita Bruta', kind: 'positive', level: 0, icon: CircleDollarSign, values: receitaBruta },
      // -- Level 1
      { id: 'receita_operacional', parentId: 'receita_bruta', label: 'Receita Operacional', kind: 'positive', level: 1, icon: CircleDollarSign, values: receitaBruta },
      // ---- Level 2
      { id: 'venda_produtos', parentId: 'receita_operacional', label: 'Venda de Produtos', kind: 'positive', level: 2, icon: CircleDollarSign, values: receitaBruta.map(v => v * 0.75) },
      { id: 'venda_servicos', parentId: 'receita_operacional', label: 'Prestação de Serviços', kind: 'positive', level: 2, icon: CircleDollarSign, values: receitaBruta.map(v => v * 0.25) },

      // 2. (-) Deduções e Cancelamentos (Level 0)
      { id: 'devolucoes_cancelamentos', label: '(-) Deduções e Cancelamentos', kind: 'deduction', level: 0, icon: MinusCircle, values: devolucoes.map((_, i) => -(devolucoes[i] + impostos[i])) },
      // -- Level 1
      { id: 'devolucoes_comerciais', parentId: 'devolucoes_cancelamentos', label: '(-) Devolucoes e Cancelamentos', kind: 'deduction', level: 1, icon: MinusCircle, values: devolucoes.map(v => -v) },
      // ---- Level 2
      { id: 'devolucao_produtos', parentId: 'devolucoes_comerciais', label: '(-) Devolução de Produtos', kind: 'deduction', level: 2, icon: MinusCircle, values: devolucoes.map(v => -v * 0.8) },
      { id: 'cancelamento_servicos', parentId: 'devolucoes_comerciais', label: '(-) Cancelamento de Serviços', kind: 'deduction', level: 2, icon: MinusCircle, values: devolucoes.map(v => -v * 0.2) },
      // -- Level 1
      { id: 'impostos_vendas', parentId: 'devolucoes_cancelamentos', label: '(-) Impostos sobre Vendas', kind: 'deduction', level: 1, icon: BadgePercent, values: impostos.map(v => -v) },
      // ---- Level 2
      { id: 'icms_iss', parentId: 'impostos_vendas', label: '(-) ICMS e ISS', kind: 'deduction', level: 2, icon: BadgePercent, values: impostos.map(v => -v * 0.6) },
      { id: 'pis_cofins', parentId: 'impostos_vendas', label: '(-) PIS e COFINS', kind: 'deduction', level: 2, icon: BadgePercent, values: impostos.map(v => -v * 0.4) },

      // 3. Receita Líquida (Level 0, Subtotal)
      { id: 'receita_liquida', label: 'Receita Liquida', kind: 'subtotal', level: 0, icon: Sigma, values: receitaLiquida },

      // 4. (-) Custos Operacionais (Level 0)
      { id: 'custos_operacionais', label: '(-) Custos Operacionais', kind: 'cost', level: 0, icon: ArrowDownRight, values: cmv.map(v => -v) },
      // -- Level 1
      { id: 'custo_vendas', parentId: 'custos_operacionais', label: '(-) CMV / CSP', kind: 'cost', level: 1, icon: ArrowDownRight, values: cmv.map(v => -v) },
      // ---- Level 2
      { id: 'cpv', parentId: 'custo_vendas', label: '(-) Custo de Produtos CPV', kind: 'cost', level: 2, icon: ArrowDownRight, values: cmv.map(v => -v * 0.7) },
      { id: 'csp', parentId: 'custo_vendas', label: '(-) Custo de Serviços CSP', kind: 'cost', level: 2, icon: ArrowDownRight, values: cmv.map(v => -v * 0.3) },

      // 5. Lucro Bruto (Level 0, Subtotal)
      { id: 'lucro_bruto', label: 'Lucro Bruto', kind: 'subtotal', level: 0, icon: TrendingUp, values: lucroBruto },

      // 6. (-) Despesas Operacionais (Level 0)
      { id: 'despesas_operacionais', label: '(-) Despesas Operacionais', kind: 'expense', level: 0, icon: PieChart, values: despesasComerciais.map((_, i) => -(despesasComerciais[i] + despesasAdm[i] + marketing[i])) },
      // -- Level 1
      { id: 'despesas_comerciais', parentId: 'despesas_operacionais', label: '(-) Despesas Comerciais', kind: 'expense', level: 1, icon: PieChart, values: despesasComerciais.map(v => -v) },
      // ---- Level 2
      { id: 'comissao_vendas', parentId: 'despesas_comerciais', label: '(-) Comissão de Vendas', kind: 'expense', level: 2, icon: PieChart, values: despesasComerciais.map(v => -v * 0.6) },
      { id: 'fretes', parentId: 'despesas_comerciais', label: '(-) Fretes e Logística', kind: 'expense', level: 2, icon: PieChart, values: despesasComerciais.map(v => -v * 0.4) },
      // -- Level 1
      { id: 'despesas_adm', parentId: 'despesas_operacionais', label: '(-) Despesas Administrativas', kind: 'expense', level: 1, icon: Gauge, values: despesasAdm.map(v => -v) },
      // ---- Level 2
      { id: 'salarios', parentId: 'despesas_adm', label: '(-) Salários e Encargos', kind: 'expense', level: 2, icon: Gauge, values: despesasAdm.map(v => -v * 0.7) },
      { id: 'aluguel', parentId: 'despesas_adm', label: '(-) Aluguel e Escritório', kind: 'expense', level: 2, icon: Gauge, values: despesasAdm.map(v => -v * 0.3) },
      // -- Level 1
      { id: 'marketing_growth', parentId: 'despesas_operacionais', label: '(-) Marketing e Growth', kind: 'expense', level: 1, icon: BadgePercent, values: marketing.map(v => -v) },
      // ---- Level 2
      { id: 'trafego_pago', parentId: 'marketing_growth', label: '(-) Tráfego Pago', kind: 'expense', level: 2, icon: BadgePercent, values: marketing.map(v => -v * 0.8) },
      { id: 'agencias_eventos', parentId: 'marketing_growth', label: '(-) Agências e Parcerias', kind: 'expense', level: 2, icon: BadgePercent, values: marketing.map(v => -v * 0.2) },

      // 7. EBITDA (Level 0, Subtotal)
      { id: 'ebitda', label: 'EBITDA', kind: 'subtotal', level: 0, icon: Sigma, values: ebitda },

      // 8. (-) Depreciação e Amortização (Level 0)
      { id: 'depreciacao_amortizacao', label: '(-) Depreciacao / Amortizacao', kind: 'expense', level: 0, icon: ArrowDownRight, values: depreciacao.map(v => -v) },
      // -- Level 1
      { id: 'depreciacao_ativos', parentId: 'depreciacao_amortizacao', label: '(-) Depreciação de Ativos', kind: 'expense', level: 1, icon: ArrowDownRight, values: depreciacao.map(v => -v) },
      // ---- Level 2
      { id: 'depreciacao_fisicos', parentId: 'depreciacao_ativos', label: '(-) Depreciação de Equipamentos', kind: 'expense', level: 2, icon: ArrowDownRight, values: depreciacao.map(v => -v * 0.75) },
      { id: 'amortizacao_sistemas', parentId: 'depreciacao_ativos', label: '(-) Amortização de Intangíveis', kind: 'expense', level: 2, icon: ArrowDownRight, values: depreciacao.map(v => -v * 0.25) },

      // 9. EBIT (Level 0, Subtotal)
      { id: 'ebit', label: 'EBIT', kind: 'subtotal', level: 0, icon: Gauge, values: ebit },

      // 10. (+/-) Resultado Financeiro (Level 0)
      { id: 'resultado_financeiro', label: '(+/-) Resultado Financeiro', kind: 'expense', level: 0, icon: ArrowDownRight, values: resultadoFinanceiro },
      // -- Level 1
      { id: 'receitas_financeiras', parentId: 'resultado_financeiro', label: '(+) Receitas Financeiras', kind: 'positive', level: 1, icon: ArrowDownRight, values: receitaLiquida.map(v => v * 0.005) },
      // ---- Level 2
      { id: 'rendimento_aplicacoes', parentId: 'receitas_financeiras', label: 'Rendimento de Aplicações', kind: 'positive', level: 2, icon: ArrowDownRight, values: receitaLiquida.map(v => v * 0.005) },
      // -- Level 1
      { id: 'despesas_financeiras', parentId: 'resultado_financeiro', label: '(-) Despesas Financeiras', kind: 'expense', level: 1, icon: ArrowDownRight, values: receitaLiquida.map(v => v * -0.018) },
      // ---- Level 2
      { id: 'juros_tarifas', parentId: 'despesas_financeiras', label: '(-) Juros e Custos Bancários', kind: 'expense', level: 2, icon: ArrowDownRight, values: receitaLiquida.map(v => v * -0.018) },

      // 11. Lucro Antes IR/CS (Level 0, Subtotal)
      { id: 'lucro_antes_ir', label: 'Lucro Antes IR/CS', kind: 'subtotal', level: 0, icon: Sigma, values: lucroAntesIr },

      // 12. (-) Provisão de IR/CS (Level 0)
      { id: 'provisao_ircs', label: '(-) IR/CS', kind: 'deduction', level: 0, icon: BadgePercent, values: ircs.map(v => -v) },
      // -- Level 1
      { id: 'impostos_lucro', parentId: 'provisao_ircs', label: '(-) Impostos sobre o Lucro', kind: 'deduction', level: 1, icon: BadgePercent, values: ircs.map(v => -v) },
      // ---- Level 2
      { id: 'irpj', parentId: 'impostos_lucro', label: '(-) IRPJ', kind: 'deduction', level: 2, icon: BadgePercent, values: ircs.map(v => -v * 0.65) },
      { id: 'csll', parentId: 'impostos_lucro', label: '(-) CSLL', kind: 'deduction', level: 2, icon: BadgePercent, values: ircs.map(v => -v * 0.35) },

      // 13. Lucro Líquido (Level 0, Subtotal)
      { id: 'lucro_liquido', label: 'Lucro Liquido', kind: 'result', level: 0, icon: ArrowUpRight, values: lucroLiquido },
    ];

    const chart = months.map((month, index) => ({
      month,
      Receita: receitaLiquida[index],
      EBITDA: ebitda[index],
      Lucro: lucroLiquido[index],
      margemEbitda: ebitda[index] / receitaLiquida[index] * 100,
      margemLiquida: lucroLiquido[index] / receitaLiquida[index] * 100,
    }));

    return { lines, receitaBruta, receitaLiquida, cmv, devolucoes, impostos, despesasComerciais, despesasAdm, marketing, ebitda, lucroLiquido, chart };
  }, [branch]);

  const receitaLiquidaTotal = sum(data.receitaLiquida);
  const lucroLiquidoTotal = sum(data.lucroLiquido);
  const ebitdaTotal = sum(data.ebitda);
  const margemLiquida = lucroLiquidoTotal / receitaLiquidaTotal * 100;
  const margemEbitda = ebitdaTotal / receitaLiquidaTotal * 100;
  const crescimento = (data.receitaLiquida[11] / data.receitaLiquida[0] - 1) * 100;
  const despesasTotal = sum(data.despesasComerciais) + sum(data.despesasAdm) + sum(data.marketing);

  const kpis = [
    { label: 'Receita Liquida', value: formatBRL(receitaLiquidaTotal), detail: `${formatPct(crescimento)} Jan-Dez`, icon: CircleDollarSign, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
    { label: 'EBITDA', value: formatBRL(ebitdaTotal), detail: `${margemEbitda.toFixed(1)}% margem`, icon: Sigma, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { label: 'Lucro Liquido', value: formatBRL(lucroLiquidoTotal), detail: `${margemLiquida.toFixed(1)}% margem`, icon: ArrowUpRight, tone: 'text-teal-700 bg-teal-50 border-teal-100' },
    { label: 'Despesas Operacionais', value: formatBRL(despesasTotal), detail: `${(despesasTotal / receitaLiquidaTotal * 100).toFixed(1)}% AV`, icon: Gauge, tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  ];

  const lineTotal = (label: string) => sum(data.lines.find(line => line.label === label)?.values ?? []);
  const sankeyDetails = {
    receita: {
      title: 'Receita Bruta',
      value: sum(data.receitaBruta),
      description: 'Valor total antes de deducoes comerciais e impostos.',
      rows: [
        { label: 'Receita de Produtos (faturamento)', value: sum(data.receitaBruta) * 0.75 },
        { label: 'Receita de Serviços (prestação)', value: sum(data.receitaBruta) * 0.25 },
      ],
    },
    deducoes: {
      title: 'Deducoes da Receita',
      value: sum(data.receitaBruta) - receitaLiquidaTotal,
      description: 'Cancelamentos, devolucoes e impostos que reduzem a receita bruta.',
      rows: [
        { label: 'Devolucoes e cancelamentos', value: Math.abs(lineTotal('(-) Devolucoes e Cancelamentos')) },
        { label: 'Impostos sobre vendas', value: Math.abs(lineTotal('(-) Impostos sobre Vendas')) },
      ],
    },
    receitaLiquida: {
      title: 'Receita Liquida',
      value: receitaLiquidaTotal,
      description: 'Base principal para analise vertical da DRE.',
      rows: [
        { label: 'Receita bruta', value: sum(data.receitaBruta) },
        { label: '(-) Deducoes totais', value: -(sum(data.receitaBruta) - receitaLiquidaTotal) },
        { label: 'Receita liquida', value: receitaLiquidaTotal },
      ],
    },
    custos: {
      title: 'Custos',
      value: Math.abs(sum(data.cmv)),
      description: 'Custos diretos de mercadorias, servicos e entrega.',
      rows: [
        { label: 'CMV / CSP', value: Math.abs(lineTotal('(-) CMV / CSP')) },
      ],
    },
    lucroBruto: {
      title: 'Lucro Bruto',
      value: receitaLiquidaTotal - Math.abs(sum(data.cmv)),
      description: 'Resultado apos custos diretos. Indica eficiência da operação antes das despesas.',
      rows: [
        { label: 'Receita liquida', value: receitaLiquidaTotal },
        { label: '(-) CMV / CSP', value: lineTotal('(-) CMV / CSP') },
        { label: 'Lucro bruto', value: lineTotal('Lucro Bruto') },
      ],
    },
    despesas: {
      title: 'Despesas Operacionais',
      value: despesasTotal,
      description: 'Despesas comerciais, administrativas e marketing.',
      rows: [
        { label: 'Despesas comerciais', value: Math.abs(lineTotal('(-) Despesas Comerciais')) },
        { label: 'Despesas administrativas', value: Math.abs(lineTotal('(-) Despesas Administrativas')) },
        { label: 'Marketing e growth', value: Math.abs(lineTotal('(-) Marketing e Growth')) },
      ],
    },
    lucroLiquido: {
      title: 'Lucro Liquido',
      value: lucroLiquidoTotal,
      description: 'Resultado final apos custos, despesas, depreciacao, resultado financeiro e impostos.',
      rows: [
        { label: 'Receita liquida', value: receitaLiquidaTotal },
        { label: '(-) CMV / CSP', value: lineTotal('(-) CMV / CSP') },
        { label: '(-) Despesas operacionais', value: -despesasTotal },
        { label: 'EBITDA', value: ebitdaTotal },
        { label: '(-) Depreciacao / amortizacao', value: lineTotal('(-) Depreciacao / Amortizacao') },
        { label: '(+/-) Resultado financeiro', value: lineTotal('(+/-) Resultado Financeiro') },
        { label: '(-) IR/CS', value: lineTotal('(-) IR/CS') },
        { label: 'Lucro liquido', value: lucroLiquidoTotal },
      ],
    },
  };

  const selectedDetail = selectedSankeyNode ? sankeyDetails[selectedSankeyNode as keyof typeof sankeyDetails] : null;

  // Hierarchical expand/collapse helpers
  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const nextExpanded: Record<string, boolean> = {};
    data.lines.forEach(line => {
      const hasChildren = data.lines.some(l => l.parentId === line.id);
      if (hasChildren) {
        nextExpanded[line.id] = true;
      }
    });
    setExpandedRows(nextExpanded);
  };

  const collapseAll = () => {
    setExpandedRows({});
  };

  const expandToLevel = (level: number) => {
    const nextExpanded: Record<string, boolean> = {};
    data.lines.forEach(line => {
      const hasChildren = data.lines.some(l => l.parentId === line.id);
      if (line.level <= level && hasChildren) {
        nextExpanded[line.id] = true;
      }
    });
    setExpandedRows(nextExpanded);
  };

  // Row visibility check (visible if all ancestors are expanded)
  const isRowVisible = (line: DreLine) => {
    let currentParentId = line.parentId;
    while (currentParentId) {
      if (!expandedRows[currentParentId]) {
        return false;
      }
      const parent = data.lines.find(l => l.id === currentParentId);
      currentParentId = parent?.parentId;
    }
    return true;
  };

  // Sorting helpers
  const handleSort = (column: 'label' | 'total' | number, measure: 'value' | 'av' | 'ah') => {
    setSortState(prev => {
      if (prev.column === column && prev.measure === measure) {
        if (prev.direction === 'asc') return { column, measure, direction: 'desc' };
        return { column: null, measure: 'value', direction: null };
      }
      return { column, measure, direction: 'asc' };
    });
  };

  const getSortValue = (node: DreLine, column: 'label' | 'total' | number, measure: 'value' | 'av' | 'ah'): number | string => {
    if (column === 'label') {
      return node.label;
    }
    
    if (column === 'total') {
      const totalVal = sum(node.values);
      if (measure === 'value') return totalVal;
      if (measure === 'av') return totalVal / receitaLiquidaTotal * 100;
      return node.values[0] !== 0 ? (node.values[11] / node.values[0] - 1) * 100 : 0;
    }
    
    // column is a month index (0 to 11)
    const monthVal = node.values[column];
    if (measure === 'value') return monthVal;
    if (measure === 'av') {
      const monthReceitaLiquida = data.receitaLiquida[column];
      return monthReceitaLiquida !== 0 ? (monthVal / monthReceitaLiquida * 100) : 0;
    }
    if (measure === 'ah') {
      if (column === 0) return 0;
      const prevVal = node.values[column - 1];
      return prevVal !== 0 ? (monthVal / prevVal - 1) * 100 : 0;
    }
    
    return 0;
  };

  const sortNodes = (nodesList: DreLine[], parentId: string | undefined): DreLine[] => {
    const children = nodesList.filter(n => n.parentId === parentId);
    
    // Hierarchical sort: only sort child levels (1 and 2). Level 0 remains in chronological accounting order.
    if (parentId !== undefined && sortState.direction && sortState.column !== null) {
      children.sort((a, b) => {
        const valA = getSortValue(a, sortState.column!, sortState.measure);
        const valB = getSortValue(b, sortState.column!, sortState.measure);
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortState.direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        } else {
          return sortState.direction === 'asc'
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
      });
    }
    
    const result: DreLine[] = [];
    children.forEach(child => {
      result.push(child);
      result.push(...sortNodes(nodesList, child.id));
    });
    
    return result;
  };

  // Memoized processed lines (hierarchical sort & parent collapse visibility)
  const processedLines = useMemo(() => {
    const sorted = sortNodes(data.lines, undefined);
    return sorted.filter(isRowVisible);
  }, [data.lines, expandedRows, sortState]);

  const renderSortIcon = (column: 'label' | 'total' | number, measure: 'value' | 'av' | 'ah') => {
    const isActive = sortState.column === column && sortState.measure === measure;
    if (!isActive) return <ChevronsUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />;
    if (sortState.direction === 'asc') return <ArrowUp className="w-3 h-3 text-blue-600 font-bold" />;
    return <ArrowDown className="w-3 h-3 text-blue-600 font-bold" />;
  };

  return (
    <div className="space-y-4 pb-8">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map(item => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                <h3 className="text-xl font-extrabold text-slate-900">{item.value}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{item.detail}</p>
              </div>
              <div className={`h-10 w-10 rounded-full border flex items-center justify-center ${item.tone}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[330px] flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Sankey do Resultado</h3>
              <p className="text-[10px] text-slate-400">Da receita bruta ate lucro liquido anual</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 text-[10px] font-extrabold uppercase text-emerald-700">
              <ArrowUpRight className="w-3 h-3" />
              Margem {margemLiquida.toFixed(1)}%
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <SankeyFlow
              receita={sum(data.receitaBruta)}
              deducoes={sum(data.receitaBruta) - receitaLiquidaTotal}
              custos={Math.abs(sum(data.cmv))}
              despesas={despesasTotal}
              lucro={lucroLiquidoTotal}
              onNodeClick={setSelectedSankeyNode}
            />
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[330px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Margens Mensais</h3>
          <p className="text-[10px] text-slate-400 mb-2">Receita, EBITDA e lucro liquido</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chart} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis yAxisId="value" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <YAxis yAxisId="pct" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any, name: any) => String(name).includes('margem') ? `${Number(value).toFixed(1)}%` : formatBRL(Number(value))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                <Bar yAxisId="value" dataKey="Receita" fill="#bfdbfe" radius={[2, 2, 0, 0]} maxBarSize={22} />
                <Line yAxisId="value" type="monotone" dataKey="EBITDA" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line yAxisId="pct" type="monotone" dataKey="margemLiquida" name="margem liquida" stroke="#0f172a" strokeWidth={2} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Matriz DRE Gerencial</h3>
              <p className="text-[11px] text-slate-400">Meses do ano, analise vertical e analise horizontal</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md shadow-xs bg-white border border-slate-200 p-0.5 text-xs">
                <button 
                  onClick={collapseAll}
                  className="px-2.5 py-1 rounded-md text-slate-650 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
                  title="Mostrar apenas Nível 1"
                >
                  Recolher Tudo
                </button>
                <button 
                  onClick={() => expandToLevel(0)}
                  className="px-2.5 py-1 rounded-md text-slate-650 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
                  title="Mostrar até Nível 2"
                >
                  Nível 2
                </button>
                <button 
                  onClick={expandAll}
                  className="px-2.5 py-1 rounded-md text-blue-700 hover:bg-blue-50 font-bold cursor-pointer transition-colors"
                  title="Mostrar até Nível 3 (Todos)"
                >
                  Expandir Tudo
                </button>
              </div>

              <span className="text-[10px] font-extrabold uppercase text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1.5 h-fit">
                {branch === 'All' ? 'Todas filiais' : branch}
              </span>
            </div>
          </div>
          <div className="overflow-auto max-h-[620px]">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm border-b border-slate-200">
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 bg-slate-100/70">
                  <th rowSpan={2} className="py-3 px-3 sticky left-0 bg-slate-100 z-30 min-w-[280px] border-r border-slate-200 text-left align-middle">
                    <div 
                      onClick={() => handleSort('label', 'value')}
                      className="flex items-center gap-1.5 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                    >
                      <span className="font-bold">Conta DRE</span>
                      {renderSortIcon('label', 'value')}
                    </div>
                  </th>
                  {months.map(month => (
                    <th key={month} colSpan={3} className="py-1.5 px-2 text-center border-r border-slate-200 bg-slate-50">
                      {month}
                    </th>
                  ))}
                  <th colSpan={3} className="py-1.5 px-2 text-center bg-blue-100/50 text-blue-800 border-l border-slate-300">
                    Total
                  </th>
                </tr>
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-slate-50 border-b border-slate-200">
                  {months.map((month, mIndex) => (
                    <React.Fragment key={`sub-${month}`}>
                      <th className="py-1.5 px-2 text-right border-r border-slate-100 font-semibold text-slate-500">
                        <div 
                          onClick={() => handleSort(mIndex, 'value')}
                          className="flex items-center justify-end gap-1 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                        >
                          <span>Valor</span>
                          {renderSortIcon(mIndex, 'value')}
                        </div>
                      </th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-100 font-bold text-emerald-700 bg-emerald-50/40">
                        <div 
                          onClick={() => handleSort(mIndex, 'av')}
                          className="flex items-center justify-end gap-0.5 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                        >
                          <span>AV %</span>
                          {renderSortIcon(mIndex, 'av')}
                        </div>
                      </th>
                      <th className="py-1.5 px-2 text-right border-r border-slate-200 font-bold text-amber-700 bg-amber-50/40">
                        <div 
                          onClick={() => handleSort(mIndex, 'ah')}
                          className="flex items-center justify-end gap-0.5 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                        >
                          <span>AH %</span>
                          {renderSortIcon(mIndex, 'ah')}
                        </div>
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="py-1.5 px-2 text-right border-r border-slate-200 font-extrabold text-blue-850 bg-blue-50/80 border-l border-slate-300">
                    <div 
                      onClick={() => handleSort('total', 'value')}
                      className="flex items-center justify-end gap-1 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                    >
                      <span>Valor</span>
                      {renderSortIcon('total', 'value')}
                    </div>
                  </th>
                  <th className="py-1.5 px-2 text-right border-r border-slate-200 font-extrabold text-emerald-800 bg-emerald-50/60">
                    <div 
                      onClick={() => handleSort('total', 'av')}
                      className="flex items-center justify-end gap-0.5 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                    >
                      <span>AV %</span>
                      {renderSortIcon('total', 'av')}
                    </div>
                  </th>
                  <th className="py-1.5 px-2 text-right font-extrabold text-amber-800 bg-amber-50/60">
                    <div 
                      onClick={() => handleSort('total', 'ah')}
                      className="flex items-center justify-end gap-0.5 cursor-pointer select-none group hover:text-blue-600 transition-colors"
                    >
                      <span>AH %</span>
                      {renderSortIcon('total', 'ah')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedLines.map(line => {
                  const Icon = line.icon;
                  const total = sum(line.values);
                  const isNegative = total < 0;
                  const isExpanded = !!expandedRows[line.id];
                  const hasChildren = data.lines.some(l => l.parentId === line.id);

                  return (
                    <tr key={line.id} className={`${rowClasses[line.kind]} hover:bg-blue-50/50 transition-colors`}>
                      <td className={`py-2 px-3 sticky left-0 z-10 ${rowClasses[line.kind]} border-r border-slate-200`}>
                        <div className="flex items-center" style={{ paddingLeft: line.level * 16 }}>
                          {/* Toggle expand/collapse button */}
                          <div className="w-5 flex items-center justify-center mr-1">
                            {hasChildren ? (
                              <button
                                onClick={() => toggleRow(line.id)}
                                className="p-0.5 rounded hover:bg-slate-200/60 text-slate-500 cursor-pointer flex items-center justify-center transition-colors"
                                aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <div className="w-3.5" />
                            )}
                          </div>
                          
                          <span className={`h-6 w-6 rounded-md border flex items-center justify-center mr-2 ${iconClasses[line.kind]}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          
                          <span className={`
                            ${line.level === 0 ? 'font-bold text-slate-800' : ''}
                            ${line.level === 1 ? 'font-semibold text-slate-600' : ''}
                            ${line.level === 2 ? 'font-normal text-slate-500 text-[11px]' : ''}
                          `}>
                            {line.label}
                          </span>
                        </div>
                      </td>
                      {line.values.map((value, index) => {
                        const avMonth = data.receitaLiquida[index] !== 0 ? (value / data.receitaLiquida[index] * 100) : 0;
                        const prevValue = index > 0 ? line.values[index - 1] : 0;
                        const ahMonth = index > 0 && prevValue !== 0 ? (value / prevValue - 1) * 100 : 0;
                        const hasPrev = index > 0 && prevValue !== 0;

                        return (
                          <React.Fragment key={`${line.id}-${months[index]}`}>
                            <td className={`py-2 px-2.5 text-right font-semibold border-r border-slate-100 ${value < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {formatShort(value)}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold text-[10px] border-r border-slate-100 bg-emerald-50/20 text-emerald-800">
                              {avMonth.toFixed(1)}%
                            </td>
                            <td className={`py-2 px-2 text-right font-semibold text-[10px] border-r border-slate-205 bg-amber-50/20 ${!hasPrev ? 'text-slate-400' : ahMonth < 0 ? 'text-rose-600' : 'text-amber-800'}`}>
                              {hasPrev ? `${ahMonth >= 0 ? '+' : ''}${ahMonth.toFixed(1)}%` : '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className={`py-2 px-2.5 text-right font-extrabold border-r border-slate-350 bg-blue-50/40 border-l border-slate-300 ${isNegative ? 'text-rose-700' : 'text-blue-800'}`}>
                        {formatBRL(total)}
                      </td>
                      <td className="py-2 px-2 text-right font-extrabold text-[10px] border-r border-slate-200 bg-emerald-50/40 text-emerald-900">
                        {(total / receitaLiquidaTotal * 100).toFixed(1)}%
                      </td>
                      <td className={`py-2 px-2 text-right font-extrabold text-[10px] bg-amber-50/40 ${line.values[0] === 0 ? 'text-slate-400' : (line.values[11] / line.values[0] - 1) < 0 ? 'text-rose-750' : 'text-amber-900'}`}>
                        {line.values[0] !== 0 ? formatPct((line.values[11] / line.values[0] - 1) * 100) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {selectedDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-md p-4 animate-fade-in cursor-pointer"
          onClick={() => setSelectedSankeyNode(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl animate-scale-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Detalhamento Sankey</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900">{selectedDetail.title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">{selectedDetail.description}</p>
              </div>
              <button
                onClick={() => setSelectedSankeyNode(null)}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 cursor-pointer flex items-center justify-center"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border-b border-slate-100">
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">Valor anual</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">{formatBRL(selectedDetail.value)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-600">Analise vertical</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-800">{(selectedDetail.value / receitaLiquidaTotal * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] font-bold uppercase text-amber-600">Base</p>
                <p className="mt-1 text-lg font-extrabold text-amber-800">{branch === 'All' ? 'Todas' : branch}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-md border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Componente</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-right">Analise Vertical</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDetail.rows.map(row => (
                      <tr key={row.label}>
                        <td className="px-3 py-2 font-semibold text-slate-700">{row.label}</td>
                        <td className={`px-3 py-2 text-right font-bold ${row.value < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatBRL(row.value)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${row.value < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{(row.value / receitaLiquidaTotal * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

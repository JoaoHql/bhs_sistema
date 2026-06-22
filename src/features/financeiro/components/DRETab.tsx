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
} from 'lucide-react';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type DreKind = 'positive' | 'deduction' | 'subtotal' | 'cost' | 'expense' | 'result';

interface DreLine {
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
    { key: 'receita', x: 30, y: 128, w: 116, h: 58, label: 'Receita Bruta', value: receita, fill: '#10b981' },
    { key: 'deducoes', x: 250, y: 34, w: 112, h: 50, label: 'Deducoes', value: deducoes, fill: '#f43f5e' },
    { key: 'receitaLiquida', x: 250, y: 128, w: 120, h: 58, label: 'Receita Liquida', value: receita - deducoes, fill: '#3b82f6' },
    { key: 'custos', x: 474, y: 34, w: 102, h: 50, label: 'Custos', value: custos, fill: '#f59e0b' },
    { key: 'lucroBruto', x: 474, y: 128, w: 106, h: 58, label: 'Lucro Bruto', value: receita - deducoes - custos, fill: '#14b8a6' },
    { key: 'despesas', x: 690, y: 34, w: 112, h: 50, label: 'Despesas', value: despesas, fill: '#64748b' },
    { key: 'lucroLiquido', x: 690, y: 128, w: 112, h: 58, label: 'Lucro Liquido', value: lucro, fill: '#059669' },
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
          className="cursor-pointer"
          tabIndex={0}
          role="button"
          aria-label={`Detalhar ${node.label}`}
        >
          <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" fill="white" stroke="#e2e8f0" />
          <rect x={node.x} y={node.y} width="5" height={node.h} rx="4" fill={node.fill} />
          <text x={node.x + 14} y={node.y + 22} fontSize="11" fontWeight="800" fill="#334155">{node.label}</text>
          <text x={node.x + 14} y={node.y + 40} fontSize="12" fontWeight="900" fill="#0f172a">{formatShort(node.value)}</text>
          <text x={node.x + 14} y={node.y + node.h - 7} fontSize="8" fontWeight="800" fill="#64748b">Clique para detalhar</text>
        </g>
      ))}
    </svg>
  );
};

export const DRETab: React.FC = () => {
  const { branch } = useDashboard();
  const [selectedSankeyNode, setSelectedSankeyNode] = useState<string | null>(null);

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
      { label: 'Receita Bruta', kind: 'positive', level: 0, icon: CircleDollarSign, values: receitaBruta },
      { label: '(-) Devolucoes e Cancelamentos', kind: 'deduction', level: 1, icon: MinusCircle, values: devolucoes.map(value => -value) },
      { label: '(-) Impostos sobre Vendas', kind: 'deduction', level: 1, icon: BadgePercent, values: impostos.map(value => -value) },
      { label: 'Receita Liquida', kind: 'subtotal', level: 0, icon: Sigma, values: receitaLiquida },
      { label: '(-) CMV / CSP', kind: 'cost', level: 1, icon: ArrowDownRight, values: cmv.map(value => -value) },
      { label: 'Lucro Bruto', kind: 'subtotal', level: 0, icon: TrendingUp, values: lucroBruto },
      { label: '(-) Despesas Comerciais', kind: 'expense', level: 1, icon: PieChart, values: despesasComerciais.map(value => -value) },
      { label: '(-) Despesas Administrativas', kind: 'expense', level: 1, icon: Gauge, values: despesasAdm.map(value => -value) },
      { label: '(-) Marketing e Growth', kind: 'expense', level: 1, icon: BadgePercent, values: marketing.map(value => -value) },
      { label: 'EBITDA', kind: 'subtotal', level: 0, icon: Sigma, values: ebitda },
      { label: '(-) Depreciacao / Amortizacao', kind: 'expense', level: 1, icon: ArrowDownRight, values: depreciacao.map(value => -value) },
      { label: 'EBIT', kind: 'subtotal', level: 0, icon: Gauge, values: ebit },
      { label: '(+/-) Resultado Financeiro', kind: 'expense', level: 1, icon: ArrowDownRight, values: resultadoFinanceiro },
      { label: 'Lucro Antes IR/CS', kind: 'subtotal', level: 0, icon: Sigma, values: lucroAntesIr },
      { label: '(-) IR/CS', kind: 'deduction', level: 1, icon: BadgePercent, values: ircs.map(value => -value) },
      { label: 'Lucro Liquido', kind: 'result', level: 0, icon: ArrowUpRight, values: lucroLiquido },
    ];

    const chart = months.map((month, index) => ({
      month,
      Receita: receitaLiquida[index],
      EBITDA: ebitda[index],
      Lucro: lucroLiquido[index],
      margemEbitda: ebitda[index] / receitaLiquida[index] * 100,
      margemLiquida: lucroLiquido[index] / receitaLiquida[index] * 100,
    }));

    return { lines, receitaBruta, receitaLiquida, cmv, despesasComerciais, despesasAdm, marketing, ebitda, lucroLiquido, chart };
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
        { label: 'Receita recorrente', value: sum(data.receitaBruta) * 0.72 },
        { label: 'Receita projetos', value: sum(data.receitaBruta) * 0.18 },
        { label: 'Receita servicos pontuais', value: sum(data.receitaBruta) * 0.10 },
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
      description: 'Resultado apos custos diretos. Indica eficiencia da operacao antes das despesas.',
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

  return (
    <div className="space-y-4 pb-8">
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
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Matriz DRE Gerencial</h3>
              <p className="text-[11px] text-slate-400">Meses do ano, analise vertical e analise horizontal</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1">
              {branch === 'All' ? 'Todas filiais' : branch}
            </span>
          </div>
          <div className="overflow-auto max-h-[620px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-30 min-w-[245px]">Conta DRE</th>
                  {months.map(month => <th key={month} className="py-2.5 px-3 text-right">{month}</th>)}
                  <th className="py-2.5 px-3 text-right bg-blue-50 text-blue-700">Total</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-700 min-w-[132px]">Analise Vertical</th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-700 min-w-[142px]">Analise Horizontal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lines.map(line => {
                  const Icon = line.icon;
                  const total = sum(line.values);
                  const av = total / receitaLiquidaTotal * 100;
                  const ah = line.values[0] !== 0 ? (line.values[11] / line.values[0] - 1) * 100 : 0;
                  const isNegative = total < 0;

                  return (
                    <tr key={line.label} className={`${rowClasses[line.kind]} hover:bg-blue-50/50 transition-colors`}>
                      <td className={`py-2 px-3 sticky left-0 z-10 ${rowClasses[line.kind]}`}>
                        <div className="flex items-center gap-2" style={{ paddingLeft: line.level * 16 }}>
                          <span className={`h-6 w-6 rounded-md border flex items-center justify-center ${iconClasses[line.kind]}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-bold">{line.label}</span>
                        </div>
                      </td>
                      {line.values.map((value, index) => (
                        <td key={`${line.label}-${months[index]}`} className={`py-2 px-3 text-right font-semibold ${value < 0 ? 'text-rose-600' : ''}`}>
                          {formatShort(value)}
                        </td>
                      ))}
                      <td className={`py-2 px-3 text-right font-extrabold bg-blue-50/70 ${isNegative ? 'text-rose-700' : 'text-blue-800'}`}>
                        {formatBRL(total)}
                      </td>
                      <td className={`py-2 px-3 text-right font-extrabold bg-emerald-50/70 ${av < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                        {av.toFixed(1)}%
                      </td>
                      <td className={`py-2 px-3 text-right font-extrabold bg-amber-50/70 ${ah < 0 ? 'text-rose-700' : 'text-amber-800'}`}>
                        {formatPct(ah)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>

      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl">
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

import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { AdsBreakdownItem, AdsKpi, AdsRankingItem, AdsTimeSeriesPoint } from '../../../types';

const toneClasses: Record<AdsKpi['tone'], string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-100'
};

export const KpiGrid: React.FC<{ items: AdsKpi[] }> = ({ items }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
    {items.map(item => (
      <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${toneClasses[item.tone]}`}>
            {item.delta}
          </span>
        </div>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{item.value}</p>
      </div>
    ))}
  </div>
);

export const Panel: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; className?: string }> = ({
  title,
  subtitle,
  children,
  className = ''
}) => (
  <section className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
    <div className="px-5 py-4 border-b border-slate-100">
      <h3 className="text-sm font-black text-slate-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {children}
  </section>
);

export const TrendChart: React.FC<{
  data: AdsTimeSeriesPoint[];
  primaryKey: keyof AdsTimeSeriesPoint;
  secondaryKey: keyof AdsTimeSeriesPoint;
  primaryColor: string;
  secondaryColor: string;
}> = ({ data, primaryKey, secondaryKey, primaryColor, secondaryColor }) => (
  <div className="h-[340px] p-4">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${String(primaryKey)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.26} />
            <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`grad-${String(secondaryKey)}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', borderColor: '#e2e8f0' }} />
        <Area type="monotone" dataKey={String(primaryKey)} stroke={primaryColor} fill={`url(#grad-${String(primaryKey)})`} strokeWidth={3} />
        <Area type="monotone" dataKey={String(secondaryKey)} stroke={secondaryColor} fill={`url(#grad-${String(secondaryKey)})`} strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const DonutBreakdown: React.FC<{ data: AdsBreakdownItem[] }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 p-4">
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={62} outerRadius={92} paddingAngle={3} dataKey="value">
            {data.map(item => <Cell key={item.name} fill={item.color} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', borderColor: '#e2e8f0' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="space-y-3 self-center">
      {data.map(item => (
        <div key={item.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs font-bold text-slate-700">{item.name}</span>
          </div>
          <span className="text-xs font-black text-slate-900">{item.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

export const RankingList: React.FC<{ items: AdsRankingItem[]; valueLabel: string }> = ({ items, valueLabel }) => {
  const max = Math.max(...items.map(item => item.value), 1);

  return (
    <div className="p-4 space-y-4">
      {items.map(item => (
        <div key={item.name}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
            <span className="text-[11px] font-black text-slate-900 whitespace-nowrap">
              {valueLabel} {item.value.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-slate-900" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          {item.secondary && <p className="text-[11px] text-slate-500 mt-1">{item.secondary}</p>}
        </div>
      ))}
    </div>
  );
};

export const HorizontalBar: React.FC<{ data: AdsRankingItem[] }> = ({ data }) => (
  <div className="h-[260px] p-4">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={76} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', borderColor: '#e2e8f0' }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#2563eb" barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

interface FunnelVisualStep {
  stage: string;
  desc: string;
  val: string;
  rate: string;
  sub: string;
  width?: number;
}

export const FunnelVisual: React.FC<{
  steps: FunnelVisualStep[];
  accent: string;
  softAccent: string;
}> = ({ steps, accent, softAccent }) => {
  const widths = steps.map((step, index) => step.width ?? Math.max(28, 100 - index * 18));

  return (
    <div className="flex-1 min-h-0 grid grid-cols-[1fr_118px] gap-4 items-center">
      {/* Funnel Visual Column */}
      <div className="relative h-full min-h-[210px] flex flex-col justify-between py-1.5 overflow-hidden">
        {/* Background vertical connector line */}
        <div className="absolute inset-y-2 left-1/2 w-px bg-slate-200" />
        
        {steps.map((step, index) => (
          <div key={step.stage} className="relative flex flex-col items-center w-full">
            {/* Label above the bar */}
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide mb-0.5 z-10 select-none">
              {step.stage}
            </span>
            {/* Slanted Trapezoid Bar (wider at the top, narrower at the bottom) */}
            <div
              className="relative h-6 border border-white/70 shadow-sm flex items-center justify-center text-white z-10 transition-all duration-300"
              style={{
                width: `${widths[index]}%`,
                background: `linear-gradient(90deg, ${accent}, ${softAccent})`,
                clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)',
                opacity: 1 - index * 0.05
              }}
            >
              <span className="text-[9px] font-black bg-white/20 px-1.5 py-0 rounded border border-white/10">
                {step.val}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Side metadata cards */}
      <div className="space-y-1.5 shrink-0 w-[118px]">
        {steps.map((step, index) => (
          <div key={step.stage} className="rounded border border-slate-200 bg-slate-50/70 p-2 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] font-bold text-slate-700 truncate max-w-[70px]">{step.desc}</span>
              <span className="text-[9px] font-black text-slate-900 shrink-0">{index === 0 ? 'Base' : step.rate}</span>
            </div>
            <p className="text-[8px] font-semibold text-slate-400 truncate mt-0.5">{step.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

interface SankeyNodeCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

interface SankeyLinkPath {
  d: string;
  width: number;
  color: string;
}

export const DreStyleSankey: React.FC<{
  nodes: SankeyNodeCard[];
  links: SankeyLinkPath[];
  ariaLabel: string;
  onNodeClick?: (nodeKey: string) => void;
}> = ({ nodes, links, ariaLabel, onNodeClick }) => (
  <svg viewBox="0 0 830 232" className="w-full h-full" role="img" aria-label={ariaLabel}>
    <rect x="0" y="0" width="830" height="232" rx="8" fill="#f8fafc" />
    {links.map((link, idx) => (
      <path
        key={idx}
        d={link.d}
        fill="none"
        stroke={link.color}
        strokeWidth={link.width}
        strokeLinecap="round"
        opacity="0.38"
      />
    ))}
    {nodes.map(node => (
      <g 
        key={node.key} 
        onClick={() => onNodeClick?.(node.key)} 
        className={`group ${onNodeClick ? 'cursor-pointer' : 'cursor-default'}`}
        role={onNodeClick ? 'button' : undefined}
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
        <text x={node.x + 12} y={node.y + 16} fontSize="9.5" fontWeight="800" fill="#334155">{node.label}</text>
        <text x={node.x + 12} y={node.y + 32} fontSize="12" fontWeight="950" fill="#0f172a">{node.value}</text>
        <text x={node.x + 12} y={node.y + node.h - 18} fontSize="9" fontWeight="800" fill="#475569">
          {node.detail}
        </text>
        {onNodeClick && (
          <text 
            x={node.x + 12} 
            y={node.y + node.h - 7} 
            fontSize="8" 
            fontWeight="800" 
            className="fill-slate-500 group-hover:fill-blue-600 transition-colors duration-200"
          >
            Clique para detalhar
          </text>
        )}
      </g>
    ))}
  </svg>
);

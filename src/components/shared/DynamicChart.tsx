import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import type { ChartConfig, QueryResponse } from '../../types';
import type { ResolvedWidgetPresentation } from '../../config/widgetPresentation';
import { formatChartLabelValue, reserveLabelMargins, selectAdaptiveLabelIndexes, type AdaptiveChartKind } from '../../utils/chartLabels';
import { isQueryApiEnabled, queryApi } from '../../services/queryApi';
import { useTenantData } from '../../hooks/useTenantData';
import { tenantSessionKey } from '../../services/tenantDataCache';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Sparkles } from 'lucide-react';

interface DynamicChartProps {
  config: ChartConfig;
  screenId?: string;
  widgetId?: string;
  contentHeight?: number;
  presentation?: Pick<ResolvedWidgetPresentation, 'chartMargins' | 'labelBudget' | 'labelPolicy' | 'valueFormat'>;
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

const LEGACY_CHART_PRESENTATION = {
  chartMargins: { top: 10, right: 15, bottom: 20, left: 20 },
  labelBudget: { compact: 0, medium: 0, expanded: 0 },
  labelPolicy: 'hidden' as const,
  valueFormat: 'auto' as const,
};

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof ResizeObserver === 'undefined') {
      const { width, height } = element.getBoundingClientRect();
      setSize({ width, height });
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(current => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ config, screenId, widgetId, contentHeight, presentation }) => {
  const { queryWorkspaceData, workspaces, getBackendFilters, currentUser, screenRefreshVersion } = useDashboard();
  const { ref: chartAreaRef, size: chartSize } = useContainerSize<HTMLDivElement>();

  const shouldUseBackend = isQueryApiEnabled() && Boolean(screenId && widgetId);

  // Query aggregated data using our simulated query engine
  const localChartData = useMemo(() => {
    try {
      return queryWorkspaceData(config);
    } catch (err) {
      console.error('Erro ao executar query do gráfico:', err);
      return [];
    }
  }, [config, queryWorkspaceData]);

  const filters = getBackendFilters();
  const { data: backendResponse, isLoading, error } = useTenantData<QueryResponse>({
    enabled: shouldUseBackend,
    sessionKey: tenantSessionKey(currentUser?.client_slug, currentUser?.id),
    screenId: screenId || 'local',
    resourceId: widgetId || config.id,
    params: { filters, limit: 100 },
    refreshVersion: screenRefreshVersion,
    loader: () => queryApi.query({
      screenId: screenId || '',
      widgetId: widgetId || '',
      filters,
      limit: 100,
    }),
  });

  const chartData = shouldUseBackend ? (backendResponse?.rows ?? []) : localChartData;
  const errorMessage = error ? 'Nao foi possivel carregar este grafico.' : null;
  const isDevFallback = !shouldUseBackend && import.meta.env.DEV;

  // Find source workspace name
  const sourceWorkspace = workspaces.find(w => w.id === config.workspaceId);
  const sourceName = sourceWorkspace ? sourceWorkspace.fileNameOrConn : 'Base Desconhecida';

  // Format helper
  const formatValue = (val: number, format?: string) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    }
    if (format === 'percent') {
      return `${val.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  // Dimensions and Metrics helpers
  const xKey = config.dimensions[0]?.field || '';
  const yLabel = config.metrics[0]?.label || '';
  const yFormat = config.metrics[0]?.format;
  const chartPresentation = presentation ?? LEGACY_CHART_PRESENTATION;
  const preset = config.options?.presetType || (config.metrics.length > 1 ? 'compare' : 'simple');
  const adaptiveKind: AdaptiveChartKind = config.type === 'pie'
    ? 'pie'
    : config.type === 'line'
      ? 'line'
      : preset === 'horizontal'
        ? 'bar-horizontal'
        : 'bar';
  const labelIndexes = useMemo(() => selectAdaptiveLabelIndexes({
    kind: adaptiveKind,
    data: chartData,
    metricKeys: config.metrics.map(metric => metric.label),
    width: chartSize.width,
    height: chartSize.height,
    policy: chartPresentation.labelPolicy,
    budget: {
      compact: Math.max(0, Math.floor(chartPresentation.labelBudget.compact / Math.max(config.metrics.length, 1))),
      medium: Math.max(0, Math.floor(chartPresentation.labelBudget.medium / Math.max(config.metrics.length, 1))),
      expanded: Math.max(0, Math.floor(chartPresentation.labelBudget.expanded / Math.max(config.metrics.length, 1))),
    },
  }), [adaptiveKind, chartData, chartPresentation.labelBudget, chartPresentation.labelPolicy, chartSize.height, chartSize.width, config.metrics]);
  const chartMargins = useMemo(
    () => reserveLabelMargins(chartPresentation.chartMargins, adaptiveKind, labelIndexes.length),
    [adaptiveKind, chartPresentation.chartMargins, labelIndexes.length],
  );
  const shouldRenderLabel = (index: unknown) => typeof index === 'number' && labelIndexes.includes(index);
  const formatLabel = (value: unknown) => formatChartLabelValue(value, chartPresentation.valueFormat, yFormat);
  const renderCartesianLabel = (props: any) => {
    if (!shouldRenderLabel(props.index)) return null;
    const isHorizontal = adaptiveKind === 'bar-horizontal';
    const x = isHorizontal ? props.x + props.width + 6 : props.x + props.width / 2;
    const y = isHorizontal ? props.y + props.height / 2 : props.y - 6;
    return <text x={x} y={y} textAnchor={isHorizontal ? 'start' : 'middle'} dominantBaseline={isHorizontal ? 'middle' : undefined} fill="#475569" fontSize={9} fontWeight={700}>{formatLabel(props.value)}</text>;
  };
  const renderPieLabel = (props: any) => {
    if (!shouldRenderLabel(props.index)) return null;
    return <text x={props.x} y={props.y} textAnchor={props.textAnchor} dominantBaseline="central" fill="#475569" fontSize={9} fontWeight={700}>{`${formatLabel(props.value)} (${Math.round((props.percent || 0) * 100)}%)`}</text>;
  };

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-800 shadow-md text-[11px] font-sans">
          <p className="font-bold border-b border-slate-800 pb-1 mb-1.5">{dataPoint[xKey]}</p>
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
              <span className="font-semibold">{p.name}:</span>
              <span className="font-mono text-blue-300">{formatValue(p.value, yFormat)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Check if data exists
  const hasData = chartData && chartData.length > 0;

  // Render correct Recharts widget based on preset types
  const renderChart = () => {
    if (!hasData) {
      return (
        <div className="text-[11px] text-slate-400 text-center py-8">
          Nenhum dado retornado para os critérios definidos.
        </div>
      );
    }

    if (config.type === 'bar') {
      if (preset === 'horizontal') {
        return (
          <BarChart data={chartData} layout="vertical" margin={chartMargins}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} vertical={true} />
            <XAxis 
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
              tickLine={false}
              tickFormatter={(v) => formatValue(v, yFormat)}
            />
            <YAxis 
              dataKey={xKey}
              type="category"
              tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 650 }}
              axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.options?.goalValue && (
              <ReferenceLine 
                x={config.options.goalValue} 
                stroke="#ef4444" 
                strokeDasharray="4 4" 
                label={{ value: `Meta: ${formatValue(config.options.goalValue, yFormat)}`, fill: '#ef4444', fontSize: 8, position: 'top', fontWeight: 'bold' }} 
              />
            )}
            {config.metrics.map((m, idx) => (
              <Bar 
                key={m.field}
                dataKey={m.label} 
                fill={idx === 0 ? (config.options?.color || '#3b82f6') : DEFAULT_COLORS[idx % DEFAULT_COLORS.length]} 
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
                label={renderCartesianLabel}
              />
            ))}
            {config.metrics.length > 1 && (
              <Legend 
                iconSize={8}
                wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 8 }}
              />
            )}
          </BarChart>
        );
      }

      // Default vertical Bar Chart (simple or compare)
      return (
        <BarChart data={chartData} margin={chartMargins}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 650 }}
            axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
            axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
            tickLine={false}
            tickFormatter={(v) => formatValue(v, yFormat)}
          />
          <Tooltip content={<CustomTooltip />} />
          {config.options?.goalValue && (
            <ReferenceLine 
              y={config.options.goalValue} 
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              label={{ value: `Meta: ${formatValue(config.options.goalValue, yFormat)}`, fill: '#ef4444', fontSize: 8, position: 'top', fontWeight: 'bold' }} 
            />
          )}
          {config.metrics.map((m, idx) => (
            <Bar 
              key={m.field}
              dataKey={m.label} 
              fill={idx === 0 ? (config.options?.color || '#3b82f6') : DEFAULT_COLORS[idx % DEFAULT_COLORS.length]} 
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              label={renderCartesianLabel}
            />
          ))}
          {config.metrics.length > 1 && (
            <Legend 
              iconSize={8}
              wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 8 }}
            />
          )}
        </BarChart>
      );
    }

    if (config.type === 'line') {
      // Line Chart (simple or compare)
      return (
        <LineChart data={chartData} margin={chartMargins}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 650 }}
            axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
            axisLine={{ stroke: '#cbd5e1', strokeWidth: 0.5 }}
            tickLine={false}
            tickFormatter={(v) => formatValue(v, yFormat)}
          />
          <Tooltip content={<CustomTooltip />} />
          {config.options?.goalValue && (
            <ReferenceLine 
              y={config.options.goalValue} 
              stroke="#ef4444" 
              strokeDasharray="4 4" 
              label={{ value: `Meta: ${formatValue(config.options.goalValue, yFormat)}`, fill: '#ef4444', fontSize: 8, position: 'top', fontWeight: 'bold' }} 
            />
          )}
          {config.metrics.map((m, idx) => (
            <Line 
              key={m.field}
              type="monotone" 
              dataKey={m.label} 
              stroke={idx === 0 ? (config.options?.color || '#10b981') : DEFAULT_COLORS[idx % DEFAULT_COLORS.length]} 
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
              label={renderCartesianLabel}
            />
          ))}
          {config.metrics.length > 1 && (
            <Legend 
              iconSize={8}
              wrapperStyle={{ fontSize: 9, fontWeight: 'bold', paddingTop: 8 }}
            />
          )}
        </LineChart>
      );
    }

    // Pie chart fallback
    return (
      <PieChart margin={chartMargins}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={35}
          outerRadius={55}
          paddingAngle={3}
          dataKey={yLabel}
          nameKey={xKey}
          labelLine={false}
          label={renderPieLabel}
        >
          {chartData.map((_, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={config.options?.colors?.[index % config.options.colors.length] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={24} 
          iconSize={7} 
          iconType="circle"
          wrapperStyle={{ fontSize: 9, fontWeight: 600, color: '#64748b' }} 
        />
      </PieChart>
    );
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-350 flex flex-col justify-between space-y-4 font-sans select-none my-2.5 max-w-full"
      style={{ height: contentHeight ?? 380 }}
    >
      {/* Chart Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-1.5">
            {config.type === 'bar' && <BarChart3 className="w-4 h-4 text-blue-600" />}
            {config.type === 'line' && <LineIcon className="w-4 h-4 text-emerald-600" />}
            {config.type === 'pie' && <PieIcon className="w-4 h-4 text-amber-500" />}
            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight leading-none uppercase">{config.title}</h4>
          </div>
          <p className="text-[10px] text-slate-450 mt-1 max-w-[90%] leading-normal font-semibold">{config.description}</p>
        </div>

        {/* Small AI Engine Badge */}
        <span className="inline-flex items-center space-x-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[8px] font-extrabold px-1.5 py-0.25 rounded-md shrink-0">
          <Sparkles className="w-2 h-2 fill-blue-500/10 text-blue-600" />
          <span>QUERY IA</span>
        </span>
      </div>

      {/* Chart Display Area */}
      <div ref={chartAreaRef} className="flex-grow min-h-0 w-full flex items-center justify-center bg-slate-50/10 border border-slate-100 rounded-lg p-2">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Info */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-2 font-semibold shrink-0">
        <span>Fonte: <strong className="text-slate-500 font-bold">{sourceName}</strong></span>
        <span>{shouldUseBackend ? (isLoading ? 'Carregando Backend' : errorMessage ? 'Erro Backend' : 'Consulta Backend') : isDevFallback ? 'Mock Dev' : 'Consulta Local'}</span>
      </div>
    </div>
  );
};

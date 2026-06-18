import React from 'react';
import { RFVScatterPlot } from '../components/RFVScatterPlot';
import { GeographicMap } from '../components/GeographicMap';
import { MetaBulletChart } from '../components/MetaBulletChart';
import { CustomerDenseTable } from '../components/CustomerDenseTable';
import { useDashboard } from '../../../store/dashboardStore';
import { Users, DollarSign, Award, Percent } from 'lucide-react';

export const AnalisesView: React.FC = () => {
  const { filteredCustomers, filteredMetas } = useDashboard();

  // Calculate high-level summary cards data
  const kpiData = React.useMemo(() => {
    let totalSales = 0;
    let customerCount = filteredCustomers.length;
    let totalTarget = 0;
    let totalActualMetas = 0;

    filteredCustomers.forEach(c => {
      totalSales += c.value;
    });

    filteredMetas.forEach(m => {
      totalTarget += m.target;
      totalActualMetas += m.actual;
    });

    const targetProgress = totalTarget > 0 ? (totalActualMetas / totalTarget) * 100 : 0;
    const averageTicket = customerCount > 0 ? totalSales / customerCount : 0;

    return {
      totalSales,
      customerCount,
      targetProgress,
      averageTicket
    };
  }, [filteredCustomers, filteredMetas]);

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white border border-slate-200 rounded p-3 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow">
          <div className="p-2 rounded bg-orange-50 text-orange-600">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Faturamento Filtrado</span>
            <span className="text-sm font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(kpiData.totalSales)}
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-200 rounded p-3 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow">
          <div className="p-2 rounded bg-blue-50 text-blue-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Clientes Filtrados</span>
            <span className="text-sm font-bold text-slate-800">
              {kpiData.customerCount} empresas
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-200 rounded p-3 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow">
          <div className="p-2 rounded bg-purple-50 text-purple-600">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Atingimento Metas</span>
            <span className="text-sm font-bold text-slate-800">
              {kpiData.targetProgress.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* text-orange-600 for high density */}
        <div className="bg-white border border-slate-200 rounded p-3 shadow-sm flex items-center space-x-3 transition-shadow hover:shadow">
          <div className="p-2 rounded bg-emerald-50 text-emerald-600">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Ticket Médio</span>
            <span className="text-sm font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(kpiData.averageTicket)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Row 1 (Map & RFV scatter) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RFVScatterPlot />
        <GeographicMap />
      </div>

      {/* Grid Row 2 (Metas & Client List) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <MetaBulletChart />
        <CustomerDenseTable />
      </div>
    </div>
  );
};

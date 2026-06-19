import React, { useMemo, useState } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { Landmark, CheckCircle2, AlertTriangle, Clock, ArrowRightLeft, RefreshCw, PlugZap } from 'lucide-react';

const bankProfiles = [
  { name: 'Banco Inter', shortName: 'Inter', mark: 'i', color: '#ff7a00', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', gradient: 'from-orange-500 to-amber-400', account: 'Conta movimento' },
  { name: 'Mercado Pago', shortName: 'Mercado Pago', mark: 'mp', color: '#00a6ff', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', gradient: 'from-sky-500 to-cyan-400', account: 'Recebiveis Pix' },
  { name: 'Stripe', shortName: 'Stripe', mark: 'S', color: '#635bff', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', gradient: 'from-indigo-500 to-violet-500', account: 'Gateway USD/BRL' },
] as const;

const getBankProfile = (bank: string) => bankProfiles.find(item => item.name === bank) ?? bankProfiles[0];

export const ConciliacaoBancariaTab: React.FC = () => {
  const { branch } = useDashboard();
  const [activeBank, setActiveBank] = useState<string>('Todos');
  const [activeDate, setActiveDate] = useState<string>('Todos');

  // Mocked base transactions list
  const initialTransactions = useMemo(() => [
    { id: 'TX-001', data: '19/06/2026', banco: 'Banco Inter', desc: 'Venda de Licença #5940', tipo: 'Entrada', valorExtrato: 4500, valorSistema: 4500, status: 'Conciliado', filial: 'Filial Sul' },
    { id: 'TX-002', data: '19/06/2026', banco: 'Stripe', desc: 'Assinatura Global SaaS USD', tipo: 'Entrada', valorExtrato: 12500, valorSistema: 12450, status: 'Divergente', filial: 'Filial Sudeste' },
    { id: 'TX-003', data: '18/06/2026', banco: 'Mercado Pago', desc: 'Recebimento Pix #8911', tipo: 'Entrada', valorExtrato: 850, valorSistema: 850, status: 'Conciliado', filial: 'Filial Nordeste' },
    { id: 'TX-004', data: '18/06/2026', banco: 'Banco Inter', desc: 'Pagamento Internet Fibra', tipo: 'Saída', valorExtrato: 350, valorSistema: 350, status: 'Conciliado', filial: 'Filial Sul' },
    { id: 'TX-005', data: '18/06/2026', banco: 'Stripe', desc: 'Transferência p/ Conta Principal', tipo: 'Saída', valorExtrato: 45000, valorSistema: 0, status: 'Pendente', filial: 'Filial Sudeste' },
    { id: 'TX-006', data: '17/06/2026', banco: 'Mercado Pago', desc: 'Tarifa de Intermediação MP', tipo: 'Saída', valorExtrato: 125, valorSistema: 125, status: 'Conciliado', filial: 'Filial Nordeste' },
    { id: 'TX-007', data: '17/06/2026', banco: 'Banco Inter', desc: 'Fornecedor Equipamentos TI', tipo: 'Saída', valorExtrato: 18500, valorSistema: 18500, status: 'Conciliado', filial: 'Filial Sul' },
    { id: 'TX-008', data: '17/06/2026', banco: 'Stripe', desc: 'Reembolso Cliente Cancelamento', tipo: 'Saída', valorExtrato: 1500, valorSistema: 1500, status: 'Conciliado', filial: 'Filial Sudeste' },
    { id: 'TX-009', data: '16/06/2026', banco: 'Banco Inter', desc: 'Recebimento Duplicata #3321', tipo: 'Entrada', valorExtrato: 24000, valorSistema: 23800, status: 'Divergente', filial: 'Filial Sul' },
    { id: 'TX-010', data: '16/06/2026', banco: 'Mercado Pago', desc: 'Venda de Curso Pix #4492', tipo: 'Entrada', valorExtrato: 190, valorSistema: 190, status: 'Conciliado', filial: 'Filial Nordeste' },
    { id: 'TX-011', data: '15/06/2026', banco: 'Stripe', desc: 'Assinatura Pro Plan #1203', tipo: 'Entrada', valorExtrato: 890, valorSistema: 890, status: 'Conciliado', filial: 'Filial Sudeste' },
    { id: 'TX-012', data: '15/06/2026', banco: 'Banco Inter', desc: 'Aluguel Escritório SP', tipo: 'Saída', valorExtrato: 12000, valorSistema: 12000, status: 'Conciliado', filial: 'Filial Sudeste' },
    { id: 'TX-013', data: '15/06/2026', banco: 'Mercado Pago', desc: 'Antecipação de Recebíveis', tipo: 'Entrada', valorExtrato: 50000, valorSistema: 0, status: 'Pendente', filial: 'Filial Nordeste' },
    { id: 'TX-014', data: '14/06/2026', banco: 'Stripe', desc: 'Payout Stripe Automático', tipo: 'Saída', valorExtrato: 15000, valorSistema: 15000, status: 'Conciliado', filial: 'Filial Sudeste' },
    { id: 'TX-015', data: '14/06/2026', banco: 'Banco Inter', desc: 'Serviços Nuvem AWS Billing', tipo: 'Saída', valorExtrato: 8940, valorSistema: 8940, status: 'Conciliado', filial: 'Filial Sul' },
  ], []);

  const [localTxList, setLocalTxList] = useState(initialTransactions);

  // Apply global branch filter
  const branchFilteredList = useMemo(() => {
    if (branch === 'All') return localTxList;
    return localTxList.filter(tx => tx.filial === branch);
  }, [localTxList, branch]);

  const bankOverview = useMemo(() => {
    return bankProfiles.map(bank => {
      const transactions = branchFilteredList.filter(tx => tx.banco === bank.name);
      const pendencias = transactions.filter(tx => tx.status !== 'Conciliado').length;
      const volume = transactions.reduce((acc, tx) => acc + tx.valorExtrato, 0);

      return {
        ...bank,
        transactions: transactions.length,
        pendencias,
        volume,
      };
    });
  }, [branchFilteredList]);

  const filteredList = useMemo(() => {
    return branchFilteredList.filter(tx => {
      const matchBank = activeBank === 'Todos' || tx.banco === activeBank;
      const matchDate = activeDate === 'Todos' || tx.data === activeDate;
      return matchBank && matchDate;
    });
  }, [branchFilteredList, activeBank, activeDate]);

  // Handle bank reconciliation action
  const handleConciliar = (id: string) => {
    setLocalTxList(prev => prev.map(tx => {
      if (tx.id === id) {
        return {
          ...tx,
          status: 'Conciliado',
          valorSistema: tx.valorExtrato
        };
      }
      return tx;
    }));
  };

  // Revert all transactions to initial mock values
  const handleReset = () => {
    setLocalTxList(initialTransactions);
  };

  // Compute Bank balances based on active filtered transactions
  const bankBalances = useMemo(() => {
    let inter = 345000;
    let mp = 189500;
    let stripe = 265100;

    filteredList.forEach(tx => {
      const mult = tx.tipo === 'Entrada' ? 1 : -1;
      // Filter impacts balance on extrato value
      if (tx.banco === 'Banco Inter') inter += tx.valorExtrato * mult;
      else if (tx.banco === 'Mercado Pago') mp += tx.valorExtrato * mult;
      else if (tx.banco === 'Stripe') stripe += tx.valorExtrato * mult;
    });

    return [
      { name: 'Banco Inter', saldo: inter, color: getBankProfile('Banco Inter').color },
      { name: 'Mercado Pago', saldo: mp, color: getBankProfile('Mercado Pago').color },
      { name: 'Stripe', saldo: stripe, color: getBankProfile('Stripe').color }
    ];
  }, [filteredList, initialTransactions]);

  const totalSaldo = useMemo(() => {
    return bankBalances.reduce((acc, curr) => acc + curr.saldo, 0);
  }, [bankBalances]);

  // Compute counts and metadata for KPIs
  const stats = useMemo(() => {
    let conciliados = 0;
    let pendentes = 0;
    let divergentes = 0;
    let totalDiferenca = 0;

    filteredList.forEach(tx => {
      if (tx.status === 'Conciliado') conciliados++;
      else if (tx.status === 'Pendente') pendentes++;
      else if (tx.status === 'Divergente') {
        divergentes++;
        totalDiferenca += Math.abs(tx.valorExtrato - tx.valorSistema);
      }
    });

    const pctConciliado = filteredList.length > 0 ? (conciliados / filteredList.length) * 100 : 0;

    return {
      conciliados,
      pendentes,
      divergentes,
      pctConciliado,
      totalDiferenca,
      totalCount: filteredList.length
    };
  }, [filteredList]);

  // Data for Chart 2: Reconciliation Status by Bank
  const statusByBankData = useMemo(() => {
    const banks = ['Banco Inter', 'Mercado Pago', 'Stripe'];
    return banks.map(bank => {
      let conciliado = 0;
      let pendente = 0;
      let divergente = 0;

      filteredList.forEach(tx => {
        if (tx.banco === bank) {
          if (tx.status === 'Conciliado') conciliado += tx.valorExtrato;
          else if (tx.status === 'Pendente') pendente += tx.valorExtrato;
          else if (tx.status === 'Divergente') divergente += tx.valorExtrato;
        }
      });

      return {
        name: bank,
        Conciliado: conciliado,
        Pendente: pendente,
        Divergente: divergente
      };
    });
  }, [filteredList]);

  // Data for Chart 3: Volume Inflow vs Outflow by Date
  const volumeByDateData = useMemo(() => {
    const datesMap: Record<string, { entrada: number; saida: number }> = {};
    const dates = ['14/06/2026', '15/06/2026', '16/06/2026', '17/06/2026', '18/06/2026', '19/06/2026'];
    dates.forEach(d => {
      datesMap[d] = { entrada: 0, saida: 0 };
    });

    filteredList.forEach(tx => {
      if (datesMap[tx.data] !== undefined) {
        if (tx.tipo === 'Entrada') {
          datesMap[tx.data].entrada += tx.valorExtrato;
        } else {
          datesMap[tx.data].saida += tx.valorExtrato;
        }
      }
    });

    return Object.entries(datesMap).map(([data, vals]) => ({
      data: data.slice(0, 5), // DD/MM format
      Entradas: vals.entrada,
      Saídas: vals.saida
    }));
  }, [filteredList]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {/* KPI 1: Saldo Consolidado */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Saldo Consolidado</p>
            <h3 className="text-xl font-extrabold text-slate-800">{formatBRL(totalSaldo)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Inter, MP e Stripe ativos</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <Landmark className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        {/* KPI 2: Acurácia da Conciliação */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Taxa de Conciliação</p>
            <h3 className="text-xl font-extrabold text-emerald-600">{stats.pctConciliado.toFixed(1)}%</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{stats.conciliados} de {stats.totalCount} transações</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        {/* KPI 3: Pendências */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Pendente Extrato</p>
            <h3 className="text-xl font-extrabold text-amber-500">{stats.pendentes} títulos</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Aguardando conciliação bancária</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        {/* KPI 4: Divergências */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Divergências</p>
            <h3 className="text-xl font-extrabold text-red-600">{formatBRL(stats.totalDiferenca)}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{stats.divergentes} lançamentos inconsistentes</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Middle Grid: 3 Visuals de Conciliação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Chart 1: Saldo por Banco (Donut) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Saldos por Conta Bancária</h3>
          <p className="text-[10px] text-slate-400 mb-2">Composição do caixa por instituição</p>
          <div className="flex-grow min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bankBalances}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="saldo"
                  className="cursor-pointer"
                >
                  {bankBalances.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      fillOpacity={activeBank === 'Todos' || activeBank === entry.name ? 1 : 0.3}
                      onClick={() => setActiveBank(activeBank === entry.name ? 'Todos' : entry.name)}
                      className="cursor-pointer transition-opacity"
                    />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status por Banco (BarChart) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Status de Valores por Banco</h3>
          <p className="text-[10px] text-slate-400 mb-2">Proporção financeira de conciliação por instituição</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusByBankData}
                margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
                onClick={(data) => {
                  if (data?.activeLabel) {
                    const label = String(data.activeLabel);
                    setActiveBank(activeBank === label ? 'Todos' : label);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                <Bar dataKey="Conciliado" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={15}>
                  {statusByBankData.map(entry => (
                    <Cell key={`ok-${entry.name}`} fillOpacity={activeBank === 'Todos' || activeBank === entry.name ? 1 : 0.3} />
                  ))}
                </Bar>
                <Bar dataKey="Pendente" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={15}>
                  {statusByBankData.map(entry => (
                    <Cell key={`pending-${entry.name}`} fillOpacity={activeBank === 'Todos' || activeBank === entry.name ? 1 : 0.3} />
                  ))}
                </Bar>
                <Bar dataKey="Divergente" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={15}>
                  {statusByBankData.map(entry => (
                    <Cell key={`diff-${entry.name}`} fillOpacity={activeBank === 'Todos' || activeBank === entry.name ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Volume Diário (AreaChart) */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[320px] flex flex-col">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Fluxo de Volume Financeiro</h3>
          <p className="text-[10px] text-slate-400 mb-2">Entradas vs Saídas transacionadas por dia</p>
          <div className="flex-grow min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={volumeByDateData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                onClick={(data) => {
                  if (data?.activeLabel) {
                    const label = String(data.activeLabel);
                    const fullDate = `${label}/2026`;
                    setActiveDate(activeDate === fullDate ? 'Todos' : fullDate);
                  }
                }}
                className="cursor-pointer"
              >
                <defs>
                  <linearGradient id="colorConciliadoEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConciliadoSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="data" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} formatter={(value: any) => formatBRL(value)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px' }} />
                <Area type="monotone" dataKey="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorConciliadoEntradas)" strokeWidth={2} />
                <Area type="monotone" dataKey="Saídas" stroke="#ef4444" fillOpacity={1} fill="url(#colorConciliadoSaidas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dense Transaction Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm min-h-[620px] flex flex-col overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Conciliação de Lançamentos</h3>
            <p className="text-[11px] text-slate-400">Extratos filtrados por instituição: {activeBank} {activeDate !== 'Todos' ? `• ${activeDate}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(activeBank !== 'Todos' || activeDate !== 'Todos') && (
              <button
                onClick={() => {
                  setActiveBank('Todos');
                  setActiveDate('Todos');
                }}
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Limpar filtros visuais
              </button>
            )}
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setActiveBank('Todos')}
                className={`h-7 px-2.5 rounded text-[10px] font-extrabold uppercase transition-colors cursor-pointer ${
                  activeBank === 'Todos' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white'
                }`}
              >
                Todos
              </button>
              {bankOverview.map(bank => (
                <button
                  key={bank.name}
                  onClick={() => setActiveBank(bank.name)}
                  className={`h-7 px-2.5 rounded text-[10px] font-extrabold uppercase transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    activeBank === bank.name ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-white'
                  }`}
                  title={`${bank.account} - ${bank.pendencias} pendências`}
                >
                  <span className={`h-4 w-4 rounded bg-gradient-to-br ${bank.gradient} text-white flex items-center justify-center text-[8px] uppercase leading-none`}>
                    {bank.mark}
                  </span>
                  {bank.shortName}
                </button>
              ))}
            </div>
            <div className="text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-md font-semibold text-emerald-700 flex items-center gap-1.5">
              <PlugZap className="w-3.5 h-3.5" />
              Open Finance ativo
            </div>
            <button 
              onClick={handleReset}
              className="text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 rounded-md font-semibold text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar dados iniciais de simulação"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar
            </button>
            <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md font-semibold text-slate-600">
              Mostrando {filteredList.length} registros
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[500px] overflow-auto relative rounded border border-slate-100">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Banco</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-right">Extrato</th>
                <th className="py-2.5 px-3 text-right">Sistema</th>
                <th className="py-2.5 px-3 text-right">Diferença</th>
                <th className="py-2.5 px-3">Filial</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map(item => {
                const diff = item.valorExtrato - item.valorSistema;
                const bank = getBankProfile(item.banco);
                const bankColorClass = `${bank.text} ${bank.bg} ${bank.border}`;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Conciliado' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        item.status === 'Pendente' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${bankColorClass}`}>
                        <span className={`h-4 w-4 rounded bg-gradient-to-br ${bank.gradient} text-white flex items-center justify-center text-[8px] uppercase leading-none`}>
                          {bank.mark}
                        </span>
                        {bank.shortName}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-medium">{item.data}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{item.desc}</td>
                    <td className="py-2 px-3">
                      <span className={`font-bold ${item.tipo === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBRL(item.valorExtrato)}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-600">{formatBRL(item.valorSistema)}</td>
                    <td className={`py-2 px-3 text-right font-bold ${diff !== 0 && item.status !== 'Conciliado' ? 'text-red-600' : 'text-slate-400'}`}>
                      {item.status === 'Conciliado' ? formatBRL(0) : formatBRL(diff)}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{item.filial}</td>
                    <td className="py-1 px-3 text-center">
                      {item.status !== 'Conciliado' ? (
                        <button
                          onClick={() => handleConciliar(item.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded text-[10px] tracking-wide transition-all shadow-sm cursor-pointer inline-flex items-center gap-1 active:scale-95"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          Conciliar
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
                          ✓ Ok
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

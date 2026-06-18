import React, { useState, useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import type { RFVCluster } from '../../../types';

import { ArrowUpDown, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

const clusterStyles: Record<RFVCluster, string> = {
  Champions: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Loyal: 'bg-blue-50 text-blue-700 border-blue-200',
  New: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'At Risk': 'bg-orange-50 text-orange-700 border-orange-200',
  'About to Sleep': 'bg-slate-100 text-slate-700 border-slate-300',
};

type SortField = 'id' | 'name' | 'recency' | 'frequency' | 'value' | 'region' | 'cluster';

export const CustomerDenseTable: React.FC = () => {
  const { filteredCustomers, searchQuery, setSearchQuery } = useDashboard();
  
  // Sorting local state
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination local state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset page
  };

  // Sort customers
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB as string).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredCustomers, sortField, sortDirection]);

  // Paginated customers
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedCustomers, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded flex flex-col flex-grow">
      {/* Table Top Header controls */}
      <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
        <div>
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center">
            Lista de Clientes ({filteredCustomers.length})
          </h3>
          <p className="text-[10px] text-slate-400">Dados cadastrais e comportamento RFV de compra</p>
        </div>
        
        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por ID, nome ou UF..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded text-[11px] placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Dense Table */}
      <div className="flex-grow overflow-x-auto min-h-[300px]">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            <tr>
              <th onClick={() => handleSort('id')} className="px-3 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center space-x-1">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('name')} className="px-3 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center space-x-1">
                  <span>Nome Empresa</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('region')} className="px-3 py-2 text-center cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center justify-center space-x-1">
                  <span>UF</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('recency')} className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center justify-end space-x-1">
                  <span>Recência</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('frequency')} className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center justify-end space-x-1">
                  <span>Freq</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('value')} className="px-3 py-2 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center justify-end space-x-1">
                  <span>Faturamento</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th onClick={() => handleSort('cluster')} className="px-3 py-2 text-center cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <div className="flex items-center justify-center space-x-1">
                  <span>Segmento RFV</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100 text-[11px] text-slate-700">
            {paginatedCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-3 py-1.5 font-mono text-slate-500 font-semibold">{customer.id}</td>
                <td className="px-3 py-1.5 font-medium text-slate-950 truncate max-w-[180px]" title={customer.name}>
                  {customer.name}
                </td>
                <td className="px-3 py-1.5 text-center font-semibold text-slate-600">{customer.region}</td>
                <td className="px-3 py-1.5 text-right font-medium">
                  <span className={customer.recency > 90 ? 'text-red-500 font-bold' : ''}>
                    {customer.recency}d
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-medium">{customer.frequency}x</td>
                <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(customer.value)}
                </td>
                <td className="px-3 py-1.5 text-center">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${clusterStyles[customer.cluster]}`}>
                    {customer.cluster}
                  </span>
                </td>
              </tr>
            ))}
            
            {sortedCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-400 text-xs">
                  Nenhum cliente atende aos critérios de filtros ativos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none">
          <span>
            Exibindo <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
            <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, sortedCustomers.length)}</span> de{' '}
            <span className="font-bold text-slate-700">{sortedCustomers.length}</span> registros
          </span>

          <div className="flex space-x-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              const isCurrent = currentPage === page;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-bold transition-all ${
                    isCurrent
                      ? 'bg-orange-500 border-orange-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

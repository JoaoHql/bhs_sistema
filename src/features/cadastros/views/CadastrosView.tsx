import React, { useState, useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import type { Meta } from '../../../types';
import { Plus, Search, Edit2, Trash2, Check, X, ArrowUpDown, Tag } from 'lucide-react';


interface MappingItem {
  id: string;
  source: string;
  target: string;
}

const initialMappings: MappingItem[] = [
  { id: 'MAP-001', source: 'SW LIC', target: 'Software Licenças' },
  { id: 'MAP-002', source: 'LICENCA SOFTWARE', target: 'Software Licenças' },
  { id: 'MAP-003', source: 'CONSULTOR TI', target: 'Consultoria Integrada' },
  { id: 'MAP-004', source: 'PROJETO IMPL', target: 'Consultoria Integrada' },
  { id: 'MAP-005', source: 'SLA SUPORTE', target: 'Suporte & SLA' },
  { id: 'MAP-006', source: 'ATENDIMENTO 24H', target: 'Suporte & SLA' },
  { id: 'MAP-007', source: 'HARDWARE SERVIDOR', target: 'Hardware Infrainstr.' },
];

export const CadastrosView: React.FC = () => {
  const { metas, addMeta, updateMeta, deleteMeta } = useDashboard();
  
  // Tab control inside Cadastros (Metas vs De-Para)
  const [activeSubTab, setActiveSubTab] = useState<'metas' | 'depara'>('metas');
  
  // Search state
  const [searchMetaQuery, setSearchMetaQuery] = useState('');
  const [searchMapQuery, setSearchMapQuery] = useState('');

  // Sorting state for Metas
  const [metaSortField, setMetaSortField] = useState<keyof Meta>('category');
  const [metaSortDir, setMetaSortDir] = useState<'asc' | 'desc'>('asc');

  // Inline edit state
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editMetaValue, setEditMetaValue] = useState<string>('');
  const [editMetaField, setEditMetaField] = useState<keyof Meta | null>(null);

  // Mappings state
  const [mappings, setMappings] = useState<MappingItem[]>(initialMappings);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editMapSource, setEditMapSource] = useState('');
  const [editMapTarget, setEditMapTarget] = useState('');

  // Modal state for adding a Meta
  const [showAddMetaModal, setShowAddMetaModal] = useState(false);
  const [newMetaCategory, setNewMetaCategory] = useState('Software Licenças');
  const [newMetaBranch, setNewMetaBranch] = useState('Filial Sudeste');
  const [newMetaTarget, setNewMetaTarget] = useState('');
  const [newMetaActual, setNewMetaActual] = useState('');
  const [newMetaPeriod, setNewMetaPeriod] = useState('Jun/2026');

  // Modal state for adding a Mapping
  const [showAddMapModal, setShowAddMapModal] = useState(false);
  const [newMapSource, setNewMapSource] = useState('');
  const [newMapTarget, setNewMapTarget] = useState('Software Licenças');

  // Handle Meta Sorting
  const handleMetaSort = (field: keyof Meta) => {
    if (metaSortField === field) {
      setMetaSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setMetaSortField(field);
      setMetaSortDir('asc');
    }
  };

  const sortedMetas = useMemo(() => {
    const list = [...metas];
    
    // Filter
    const filtered = list.filter(m => 
      m.category.toLowerCase().includes(searchMetaQuery.toLowerCase()) ||
      m.branch.toLowerCase().includes(searchMetaQuery.toLowerCase()) ||
      m.period.toLowerCase().includes(searchMetaQuery.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      const valA = a[metaSortField];
      const valB = b[metaSortField];
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return metaSortDir === 'asc' ? valA - valB : valB - valA;
      }
      
      return metaSortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return filtered;
  }, [metas, searchMetaQuery, metaSortField, metaSortDir]);

  // Filtered Mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => 
      m.source.toLowerCase().includes(searchMapQuery.toLowerCase()) ||
      m.target.toLowerCase().includes(searchMapQuery.toLowerCase())
    );
  }, [mappings, searchMapQuery]);

  // Meta inline edit actions
  const startEditMeta = (meta: Meta, field: 'target' | 'actual' | 'category') => {
    setEditingMetaId(meta.id);
    setEditMetaField(field);
    setEditMetaValue(String(meta[field]));
  };

  const saveInlineMetaEdit = (meta: Meta) => {
    if (!editMetaField) return;
    
    let updatedValue: string | number = editMetaValue;
    if (editMetaField === 'target' || editMetaField === 'actual') {
      const parsed = parseFloat(editMetaValue.replace(/[^\d.-]/g, ''));
      updatedValue = isNaN(parsed) ? 0 : parsed;
    }

    updateMeta({
      ...meta,
      [editMetaField]: updatedValue
    });
    
    setEditingMetaId(null);
    setEditMetaField(null);
  };

  const handleAddMeta = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(newMetaTarget) || 0;
    const actualVal = parseFloat(newMetaActual) || 0;

    addMeta({
      category: newMetaCategory,
      branch: newMetaBranch,
      target: targetVal,
      actual: actualVal,
      period: newMetaPeriod
    });

    // Reset fields
    setNewMetaTarget('');
    setNewMetaActual('');
    setShowAddMetaModal(false);
  };

  // Mapping CRUD
  const startEditMap = (map: MappingItem) => {
    setEditingMapId(map.id);
    setEditMapSource(map.source);
    setEditMapTarget(map.target);
  };

  const saveMapEdit = (id: string) => {
    setMappings(prev => prev.map(m => m.id === id ? { id, source: editMapSource.toUpperCase(), target: editMapTarget } : m));
    setEditingMapId(null);
  };

  const deleteMap = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
  };

  const handleAddMap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapSource) return;

    const newMap: MappingItem = {
      id: `MAP-0${mappings.length + 1}`,
      source: newMapSource.toUpperCase(),
      target: newMapTarget
    };

    setMappings(prev => [newMap, ...prev]);
    setNewMapSource('');
    setShowAddMapModal(false);
  };

  return (
    <div className="space-y-5">
      {/* View Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-3">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveSubTab('metas')}
            className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
              activeSubTab === 'metas'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Metas de Vendas
          </button>
          <button
            onClick={() => setActiveSubTab('depara')}
            className={`px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
              activeSubTab === 'depara'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mapeamentos De-Para
          </button>
        </div>

        <button
          onClick={() => activeSubTab === 'metas' ? setShowAddMetaModal(true) : setShowAddMapModal(true)}
          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold rounded shadow-sm transition-colors uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{activeSubTab === 'metas' ? 'Nova Meta' : 'Novo De-Para'}</span>
        </button>
      </div>

      {/* SUBTAB 1: METAS DE VENDAS */}
      {activeSubTab === 'metas' && (
        <div className="bg-white border border-slate-200 rounded flex flex-col">
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Cadastro de Metas de Filiais</h3>
              <p className="text-[10px] text-slate-400">Clique duplo sobre os valores de Meta ou Realizado para editá-los diretamente.</p>
            </div>
            
            <div className="relative max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrar metas por filial ou categoria..."
                value={searchMetaQuery}
                onChange={(e) => setSearchMetaQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded text-[11px] placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th onClick={() => handleMetaSort('id')} className="px-4 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <div className="flex items-center space-x-1">
                      <span>ID</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleMetaSort('branch')} className="px-4 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <div className="flex items-center space-x-1">
                      <span>Filial</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleMetaSort('category')} className="px-4 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <div className="flex items-center space-x-1">
                      <span>Categoria BI</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleMetaSort('period')} className="px-4 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>Período</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleMetaSort('target')} className="px-4 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span>Meta Estabelecida</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th onClick={() => handleMetaSort('actual')} className="px-4 py-2 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span>Valor Realizado</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-[11px] text-slate-700">
                {sortedMetas.map((meta) => {
                  const isEditingThisMeta = editingMetaId === meta.id;

                  return (
                    <tr key={meta.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-4 py-2 font-mono text-slate-400 font-semibold">{meta.id}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{meta.branch}</td>
                      <td className="px-4 py-2">
                        {isEditingThisMeta && editMetaField === 'category' ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={editMetaValue}
                              onChange={(e) => setEditMetaValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveInlineMetaEdit(meta)}
                              className="border border-orange-500 rounded px-1.5 py-0.5 text-[11px] focus:outline-none w-36 bg-white"
                              autoFocus
                            />
                            <button onClick={() => saveInlineMetaEdit(meta)} className="text-emerald-600 hover:text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingMetaId(null)} className="text-red-500 hover:text-red-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:text-orange-600 flex items-center justify-between"
                            onDoubleClick={() => startEditMeta(meta, 'category')}
                            title="Duplo clique para editar"
                          >
                            <span>{meta.category}</span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-slate-500 font-semibold">{meta.period}</td>
                      
                      {/* Target Column */}
                      <td className="px-4 py-2 text-right font-medium">
                        {isEditingThisMeta && editMetaField === 'target' ? (
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              value={editMetaValue}
                              onChange={(e) => setEditMetaValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveInlineMetaEdit(meta)}
                              className="border border-orange-500 rounded px-1.5 py-0.5 text-[11px] text-right focus:outline-none w-24 bg-white"
                              autoFocus
                            />
                            <button onClick={() => saveInlineMetaEdit(meta)} className="text-emerald-600 hover:text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:text-orange-600 flex items-center justify-end space-x-1.5"
                            onDoubleClick={() => startEditMeta(meta, 'target')}
                            title="Duplo clique para editar"
                          >
                            <span>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(meta.target)}
                            </span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Actual Column */}
                      <td className="px-4 py-2 text-right font-medium">
                        {isEditingThisMeta && editMetaField === 'actual' ? (
                          <div className="flex items-center justify-end space-x-1">
                            <input
                              type="number"
                              value={editMetaValue}
                              onChange={(e) => setEditMetaValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveInlineMetaEdit(meta)}
                              className="border border-orange-500 rounded px-1.5 py-0.5 text-[11px] text-right focus:outline-none w-24 bg-white"
                              autoFocus
                            />
                            <button onClick={() => saveInlineMetaEdit(meta)} className="text-emerald-600 hover:text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:text-orange-600 flex items-center justify-end space-x-1.5"
                            onDoubleClick={() => startEditMeta(meta, 'actual')}
                            title="Duplo clique para editar"
                          >
                            <span>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(meta.actual)}
                            </span>
                            <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => deleteMeta(meta.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                          title="Remover meta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {sortedMetas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 text-xs">
                      Nenhuma meta atende aos critérios de busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DE-PARA MAPEAMENTOS */}
      {activeSubTab === 'depara' && (
        <div className="bg-white border border-slate-200 rounded flex flex-col">
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Mapeamento De-Para de Categorias</h3>
              <p className="text-[10px] text-slate-400">Associe termos brutos de vendas às categorias padronizadas do dashboard de BI.</p>
            </div>
            
            <div className="relative max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Filtrar termos mapeados..."
                value={searchMapQuery}
                onChange={(e) => setSearchMapQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded text-[11px] placeholder:text-slate-400 text-slate-700 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-[11px]">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Termo Bruto (Origem)</th>
                  <th className="px-4 py-2">Categoria Mapeada (BI Standard)</th>
                  <th className="px-4 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                {filteredMappings.map((map) => {
                  const isEditingThisMap = editingMapId === map.id;

                  return (
                    <tr key={map.id} className="hover:bg-slate-55/70 transition-colors">
                      <td className="px-4 py-2 font-mono text-slate-400 font-semibold">{map.id}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">
                        {isEditingThisMap ? (
                          <input
                            type="text"
                            value={editMapSource}
                            onChange={(e) => setEditMapSource(e.target.value)}
                            className="border border-orange-500 rounded px-1.5 py-0.5 text-[11px] uppercase focus:outline-none w-full bg-white"
                          />
                        ) : (
                          <span className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[10px]">
                            {map.source}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {isEditingThisMap ? (
                          <select
                            value={editMapTarget}
                            onChange={(e) => setEditMapTarget(e.target.value)}
                            className="border border-orange-500 rounded px-1 py-0.5 text-[11px] focus:outline-none w-full bg-white"
                          >
                            <option value="Software Licenças">Software Licenças</option>
                            <option value="Consultoria Integrada">Consultoria Integrada</option>
                            <option value="Suporte & SLA">Suporte & SLA</option>
                            <option value="Hardware Infrainstr.">Hardware Infrainstr.</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-slate-800">
                            <Tag className="w-2.5 h-2.5 text-orange-500" />
                            <span>{map.target}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isEditingThisMap ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => saveMapEdit(map.id)}
                              className="text-emerald-600 hover:text-emerald-700 font-bold"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingMapId(null)}
                              className="text-red-500 hover:text-red-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => startEditMap(map)}
                              className="text-slate-400 hover:text-orange-500 p-1 rounded transition-colors"
                              title="Editar de-para"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMap(map.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                              title="Remover de-para"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredMappings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-400 text-xs">
                      Nenhum mapeamento atende aos critérios de busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA META */}
      {showAddMetaModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-sm w-full overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Definir Nova Meta de Venda</h3>
              <button onClick={() => setShowAddMetaModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddMeta} className="p-4 space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Filial</label>
                <select
                  value={newMetaBranch}
                  onChange={(e) => setNewMetaBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                >
                  <option value="Filial Sul">Filial Sul</option>
                  <option value="Filial Sudeste">Filial Sudeste</option>
                  <option value="Filial Nordeste">Filial Nordeste</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Categoria de Venda</label>
                <select
                  value={newMetaCategory}
                  onChange={(e) => setNewMetaCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                >
                  <option value="Software Licenças">Software Licenças</option>
                  <option value="Consultoria Integrada">Consultoria Integrada</option>
                  <option value="Suporte & SLA">Suporte & SLA</option>
                  <option value="Hardware Infrainstr.">Hardware Infrainstr.</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Meta (R$)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 500000"
                    value={newMetaTarget}
                    onChange={(e) => setNewMetaTarget(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Realizado (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 350000"
                    value={newMetaActual}
                    onChange={(e) => setNewMetaActual(e.target.value)}
                    className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Período de Referência</label>
                <select
                  value={newMetaPeriod}
                  onChange={(e) => setNewMetaPeriod(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                >
                  <option value="Jun/2026">Junho 2026</option>
                  <option value="Mai/2026">Maio 2026</option>
                  <option value="Abr/2026">Abril 2026</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMetaModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-bold uppercase tracking-wider shadow-sm transition-colors"
                >
                  Adicionar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO DE-PARA */}
      {showAddMapModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-sm w-full overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Adicionar Mapeamento</h3>
              <button onClick={() => setShowAddMapModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddMap} className="p-4 space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Termo Bruto (Do ERP / Banco)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: SOFTWARE LIC"
                  value={newMapSource}
                  onChange={(e) => setNewMapSource(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 uppercase bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Mapear Para (Categoria BI)</label>
                <select
                  value={newMapTarget}
                  onChange={(e) => setNewMapTarget(e.target.value)}
                  className="w-full border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-orange-500 bg-white"
                >
                  <option value="Software Licenças">Software Licenças</option>
                  <option value="Consultoria Integrada">Consultoria Integrada</option>
                  <option value="Suporte & SLA">Suporte & SLA</option>
                  <option value="Hardware Infrainstr.">Hardware Infrainstr.</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMapModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-bold uppercase tracking-wider shadow-sm transition-colors"
                >
                  Confirmar Mapeamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

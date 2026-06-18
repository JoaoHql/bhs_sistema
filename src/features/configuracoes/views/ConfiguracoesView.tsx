import React from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { Shield, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';


export const ConfiguracoesView: React.FC = () => {
  const { 
    users, 
    syncLogs, 
    isSyncing, 
    lastUpdated, 
    syncNow, 
    updateUserPermission 
  } = useDashboard();

  return (
    <div className="space-y-6">
      {/* 2 Column Layout: Access Control and Sync Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width): Access Control Matrix */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center space-x-2">
            <div className="p-1 rounded bg-orange-100 text-orange-600">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Matriz de Controle de Acesso (RLS)</h3>
              <p className="text-[10px] text-slate-400">Gerencie as permissões por tela e políticas de acesso para cada perfil.</p>
            </div>
          </div>

          <div className="overflow-x-auto flex-grow">
            <table className="min-w-full divide-y divide-slate-200 text-left text-[11px]">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Usuário</th>
                  <th className="px-4 py-2.5">Perfil</th>
                  <th className="px-4 py-2.5 text-center">Tela Análises</th>
                  <th className="px-4 py-2.5 text-center">Tela Cadastros</th>
                  <th className="px-4 py-2.5 text-center">Tela Configurações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                {users.map((user) => {
                  const analisesPerm = user.permissions.find(p => p.screen === 'Análises')?.access || 'None';
                  const cadastrosPerm = user.permissions.find(p => p.screen === 'Cadastros')?.access || 'None';
                  const configsPerm = user.permissions.find(p => p.screen === 'Configurações')?.access || 'None';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          user.role === 'Admin' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : user.role === 'Analista'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      
                      {/* Analises Permission Selector */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={analisesPerm}
                          onChange={(e) => updateUserPermission(user.id, 'Análises', e.target.value as any)}
                          className="bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 px-2 py-0.5 focus:outline-none focus:border-orange-500"
                        >
                          <option value="None">Nenhum</option>
                          <option value="Read">Leitura</option>
                          <option value="Write">Escrita</option>
                        </select>
                      </td>

                      {/* Cadastros Permission Selector */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={cadastrosPerm}
                          disabled={user.role === 'Admin'} // Admins locked to write
                          onChange={(e) => updateUserPermission(user.id, 'Cadastros', e.target.value as any)}
                          className="bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 px-2 py-0.5 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                        >
                          <option value="None">Nenhum</option>
                          <option value="Read">Leitura</option>
                          <option value="Write">Escrita</option>
                        </select>
                      </td>

                      {/* Configs Permission Selector */}
                      <td className="px-4 py-3 text-center">
                        <select
                          value={configsPerm}
                          disabled={user.role === 'Admin'} // Admins locked to write
                          onChange={(e) => updateUserPermission(user.id, 'Configurações', e.target.value as any)}
                          className="bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 px-2 py-0.5 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                        >
                          <option value="None">Nenhum</option>
                          <option value="Read">Leitura</option>
                          <option value="Write">Escrita</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Access Banner warning */}
          <div className="p-3 bg-amber-50/50 border-t border-slate-200 rounded-b text-[10px] text-amber-700 flex items-start space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Simulação de RLS Ativada:</strong> Alterar as permissões acima afeta o comportamento das telas mockadas em tempo de execução. O perfil administrativo possui privilégios de escrita globais fixados.
            </span>
          </div>
        </div>

        {/* Right Column (1/3 width): Data Sync Monitor */}
        <div className="bg-white border border-slate-200 rounded flex flex-col shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded bg-orange-100 text-orange-600">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Carga de Banco</h3>
                <p className="text-[10px] text-slate-400">Monitor de ETL e conexões</p>
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col items-center justify-center border-b border-slate-100 bg-slate-50/20 text-center py-6">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Última Atualização</span>
            <span className="text-2xl font-black text-slate-800 font-mono my-1">{lastUpdated}</span>
            <span className="text-[10px] text-slate-500 mb-4">Atualizado automaticamente de 2 em 2 horas.</span>
            
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className={`w-full py-2 px-4 rounded text-xs font-bold uppercase tracking-wider shadow-sm transition-all duration-150 flex items-center justify-center space-x-2 ${
                isSyncing 
                  ? 'bg-orange-50 text-orange-400 border border-orange-200 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Carregando Dados...' : 'Forçar Carga Agora'}</span>
            </button>
            
            {isSyncing && (
              <p className="text-[9px] text-orange-600 font-bold mt-2 animate-pulse-fast uppercase tracking-wide">
                Executando script de ETL no banco mockado...
              </p>
            )}
          </div>

          {/* Sync History list */}
          <div className="p-4 flex-grow flex flex-col justify-start">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
              Histórico de Extrações
            </span>
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between border-b border-slate-50 pb-2 text-[10px]">
                  <div className="flex items-start space-x-2">
                    {log.status === 'Success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-700">{log.initiatedBy}</div>
                      <div className="text-slate-400 text-[9px] font-mono flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-0.5" /> {log.timestamp}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800">{log.rowsProcessed.toLocaleString()} linhas</div>
                    <div className="text-slate-400 text-[9px]">{log.durationSeconds}s duração</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

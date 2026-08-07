import React, { useState } from 'react';
import { Database, Layers3, Users } from 'lucide-react';
import { UserManagementPanel } from '../components/UserManagementPanel';
import { ClientVisibilityPanel } from '../components/ClientVisibilityPanel';
import { UpdatesPanel } from '../components/UpdatesPanel';

interface ConfiguracoesViewProps {
  clientOnly?: boolean;
}

/** Publicacao e rollback seguem como infraestrutura do repositorio, sem fluxo manual na interface. */
export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({ clientOnly = false }) => {
  const [teamArea, setTeamArea] = useState<'users' | 'views' | 'data'>('users');
  const [tenantArea, setTenantArea] = useState<'users' | 'data'>('users');

  if (clientOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Configuracoes da organizacao</h1>
          <p className="mt-1 text-sm text-slate-500">Administre os usuarios e dados da sua organizacao.</p>
        </div>
        <div className="flex gap-2 border-b border-slate-200">
          <button type="button" onClick={() => setTenantArea('users')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold ${tenantArea === 'users' ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500'}`}>
            <Users className="h-4 w-4" /> Usuarios
          </button>
          <button type="button" onClick={() => setTenantArea('data')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold ${tenantArea === 'data' ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500'}`}>
            <Database className="h-4 w-4" /> Dados
          </button>
        </div>
        {tenantArea === 'users' ? <UserManagementPanel mode="tenant" /> : <UpdatesPanel />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Configuracoes da equipe</h1>
        <p className="mt-1 text-sm text-slate-500">Usuarios e visoes de clientes sao gerenciados em areas separadas.</p>
      </div>
      <div className="flex gap-2 border-b border-slate-200">
        <button type="button" onClick={() => setTeamArea('users')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold ${teamArea === 'users' ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500'}`}>
          <Users className="h-4 w-4" /> Usuarios e MASTERs
        </button>
        <button type="button" onClick={() => setTeamArea('views')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold ${teamArea === 'views' ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500'}`}>
          <Layers3 className="h-4 w-4" /> Clientes e visoes
        </button>
        <button type="button" onClick={() => setTeamArea('data')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold ${teamArea === 'data' ? 'border-orange-500 text-orange-700' : 'border-transparent text-slate-500'}`}>
          <Database className="h-4 w-4" /> Dados
        </button>
      </div>
      {teamArea === 'users' ? <UserManagementPanel /> : teamArea === 'views' ? <ClientVisibilityPanel /> : <UpdatesPanel />}
    </div>
  );
};

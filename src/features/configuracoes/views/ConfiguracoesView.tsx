import React, { useState } from 'react';
import { Layers3, Users } from 'lucide-react';
import { UserManagementPanel } from '../components/UserManagementPanel';
import { ClientVisibilityPanel } from '../components/ClientVisibilityPanel';

interface ConfiguracoesViewProps {
  clientOnly?: boolean;
}

/** Publicacao e rollback seguem como infraestrutura do repositorio, sem fluxo manual na interface. */
export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({ clientOnly = false }) => {
  const [teamArea, setTeamArea] = useState<'users' | 'views'>('users');
  if (clientOnly) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Configuracoes da organizacao</h1>
          <p className="mt-1 text-sm text-slate-500">Administre os usuarios da sua organizacao.</p>
        </div>
        <UserManagementPanel mode="tenant" />
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
      </div>
      {teamArea === 'users' ? <UserManagementPanel /> : <ClientVisibilityPanel />}
    </div>
  );
};

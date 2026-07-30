import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Client } from '../../../types';
import { configApi, type ClientVisibilityResponse } from '../../../services/configApi';

export function ClientVisibilityPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSlug, setClientSlug] = useState('');
  const [visibility, setVisibility] = useState<ClientVisibilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    void configApi.listClients()
      .then((items) => {
        setClients(items);
        setClientSlug(items[0]?.slug ?? '');
      })
      .catch(() => setError('Nao foi possivel listar os clientes.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!clientSlug) return;
    setVisibility(null);
    setError('');
    void configApi.clientVisibility(clientSlug)
      .then(setVisibility)
      .catch(() => setError('Nao foi possivel carregar a visibilidade deste cliente.'));
  }, [clientSlug]);

  const toggle = async (type: 'module' | 'screen', id: string, visible: boolean) => {
    if (!clientSlug) return;
    setSavingId(`${type}:${id}`);
    setError('');
    try {
      setVisibility(await configApi.updateClientVisibility(clientSlug, type, id, !visible));
    } catch {
      setError('A alteracao nao foi salva. A tela continua no ultimo estado confirmado.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Telas por cliente</h2>
          <p className="mt-1 text-xs text-slate-500">Oculte ou libere modulos e telas no manifesto publicado.</p>
        </div>
        <select value={clientSlug} onChange={(event) => setClientSlug(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          {clients.map((client) => <option key={client.id} value={client.slug}>{client.name}</option>)}
        </select>
      </div>

      {loading && <div className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...</div>}
      {error && <p className="px-5 py-4 text-sm text-rose-700">{error}</p>}
      {visibility && (
        <div className="divide-y divide-slate-100">
          <div className="px-5 py-3"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar modulo ou tela" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></div>
          {visibility.modules.filter((module) => `${module.label} ${module.screens.map((screen) => screen.label).join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((module) => (
            <div key={module.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div><p className="font-bold text-slate-800">{module.label}</p><p className="text-xs text-slate-500">Modulo</p></div>
                <button type="button" onClick={() => void toggle('module', module.id, module.visible)} disabled={savingId === `module:${module.id}`} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold ${module.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {module.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{module.visible ? 'Visivel' : 'Oculto'}
                </button>
              </div>
              <div className="mt-3 space-y-2 border-l border-slate-200 pl-4">
                {module.screens.map((screen) => (
                  <div key={screen.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-600">{screen.label}</span>
                    <button type="button" onClick={() => void toggle('screen', screen.id, screen.visible)} disabled={savingId === `screen:${screen.id}`} className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold ${screen.visible ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                      {screen.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{screen.visible ? 'Visivel' : 'Oculta'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

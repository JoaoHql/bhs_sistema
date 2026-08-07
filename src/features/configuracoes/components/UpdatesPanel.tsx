import { useCallback, useEffect, useState, useRef } from 'react';
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle, X, Trash2 } from 'lucide-react';
import { updatesApi } from '../../../services/updatesApi';
import type { AreaUpdateStatus, RefreshResponse, UpdateRun } from '../../../types';
import { useDashboard } from '../../../store/dashboardStore';

const STATUS_ICON: Record<AreaUpdateStatus['status'], typeof CheckCircle2> = {
  ok: CheckCircle2,
  stale: Clock,
  error: XCircle,
};

const STATUS_COLOR: Record<AreaUpdateStatus['status'], string> = {
  ok: 'text-emerald-600',
  stale: 'text-amber-500',
  error: 'text-rose-600',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function UpdatesPanel() {
  const { currentUser } = useDashboard();
  const isMaster = currentUser?.roles?.includes('admin') && !currentUser?.is_staff;

  const [areas, setAreas] = useState<AreaUpdateStatus[]>([]);
  const [runs, setRuns] = useState<UpdateRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [selectedRun, setSelectedRun] = useState<UpdateRun | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStatus = useCallback(async () => {
    setError('');
    try {
      const [statuses, recentRuns] = await Promise.all([
        updatesApi.getStatus(),
        updatesApi.listRuns(20),
      ]);
      setAreas(statuses);
      setRuns(recentRuns);
    } catch {
      setError('Nao foi possivel carregar o status das atualizacoes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const refreshArea = async (area: string | null) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setRefreshing(area ?? 'all');
    setError('');
    try {
      const response: RefreshResponse = await updatesApi.refresh({ area }, abortController.signal);
      setAreas(response.areas);
      const freshRuns = await updatesApi.listRuns(20);
      setRuns(freshRuns);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        setError('Atualizacao cancelada.');
      } else {
        setError('Falha ao atualizar os dados. Verifique a conexao com o banco de dados.');
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        setRefreshing(null);
      }
    }
  };

  const cancelRefresh = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setRefreshing(null);
    }
  };

  const handleDeleteRun = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente apagar este registro de execucao?')) return;
    
    setDeletingId(id);
    try {
      await updatesApi.deleteRun(id);
      setRuns(prev => prev.filter(r => r.id !== id));
      if (selectedRun?.id === id) {
        setSelectedRun(null);
      }
    } catch {
      setError('Falha ao apagar o registro.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando status das atualizacoes...
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {areas.map((area) => {
              const Icon = STATUS_ICON[area.status];
              return (
                <div
                  key={area.area}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{area.label}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium cursor-help">
                      <span title={area.status === 'ok' ? 'Atualizado (OK)' : area.status === 'stale' ? 'Desatualizado' : 'Erro na ultima execucao'}>
                        <Icon 
                          className={`h-4 w-4 ${STATUS_COLOR[area.status]}`} 
                        />
                      </span>
                        {area.lastUpdatedAt
                          ? `Atualizado ${formatDate(area.lastUpdatedAt)}`
                          : 'Nunca atualizado'}
                      </p>
                      {area.rowsCount != null && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {area.rowsCount.toLocaleString('pt-BR')} registros
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => refreshArea(area.area)}
                      disabled={refreshing != null}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-orange-600 disabled:opacity-50 transition-colors"
                      title="Atualizar agora"
                    >
                      <RefreshCw
                        className={`h-5 w-5 ${refreshing === area.area ? 'animate-spin text-orange-600' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-8">
            <h3 className="text-sm font-bold text-slate-900">
              Historico de execucoes (clique para ver detalhes)
            </h3>
            <div className="flex items-center gap-3">
              {refreshing && (
                <button
                  type="button"
                  onClick={cancelRefresh}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-200 transition-colors"
                >
                  Cancelar Atualizacao
                </button>
              )}
              <button
                type="button"
                onClick={() => refreshArea(null)}
                disabled={refreshing != null}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing === 'all' ? 'animate-spin' : ''}`}
                />
                Atualizar tudo
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {runs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">
                Nenhuma execucao registrada ainda.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {runs.map((run) => (
                  <div 
                    key={run.id} 
                    onClick={() => setSelectedRun(run)}
                    className="flex items-center gap-3 px-5 py-3 text-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span
                      title={run.status === 'success' ? 'Atualizado (OK)' : run.status === 'running' ? 'Executando' : 'Erro'}
                      className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 cursor-help ${
                        run.status === 'success'
                          ? 'bg-emerald-500'
                          : run.status === 'running'
                            ? 'bg-blue-500 animate-pulse'
                            : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-bold text-slate-700 min-w-[120px] capitalize">{run.area}</span>
                    <span className="text-slate-500 hidden sm:inline-block w-20">{run.trigger}</span>
                    {run.rowsAffected != null ? (
                      <span className="text-slate-500 hidden sm:inline-block w-24 text-right">
                        {run.rowsAffected.toLocaleString('pt-BR')} linhas
                      </span>
                    ) : (
                      <span className="text-slate-400 hidden sm:inline-block w-24 text-right">—</span>
                    )}
                    {run.errorMessage ? (
                      <span className="truncate text-rose-500 max-w-[150px] sm:max-w-[300px] ml-4 text-xs font-mono">{run.errorMessage}</span>
                    ) : (
                      <span className="truncate text-slate-400 max-w-[150px] sm:max-w-[300px] ml-4 text-xs italic">Sem erros registrados</span>
                    )}
                    <span className="ml-auto text-xs font-medium text-slate-400">
                      {formatDate(run.startedAt)}
                    </span>
                    {isMaster && (
                      <button
                        title="Apagar registro"
                        onClick={(e) => handleDeleteRun(run.id, e)}
                        disabled={deletingId === run.id}
                        className="ml-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        {deletingId === run.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm transition-all" onClick={() => setSelectedRun(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Detalhes da Execucao
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedRun.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                  selectedRun.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {selectedRun.status}
                </span>
              </h2>
              <button onClick={() => setSelectedRun(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="px-6 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Area</p>
                  <p className="font-medium text-slate-900 capitalize">{selectedRun.area}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Gatilho</p>
                  <p className="font-medium text-slate-900 capitalize">{selectedRun.trigger}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Inicio</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedRun.startedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Fim</p>
                  <p className="font-medium text-slate-900">{formatDate(selectedRun.finishedAt)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Linhas Afetadas</p>
                  <p className="font-medium text-slate-900">{selectedRun.rowsAffected?.toLocaleString('pt-BR') ?? 'Nao disponivel'}</p>
                </div>
              </div>

              {selectedRun.errorMessage && (
                <div className="mt-6 rounded-xl bg-rose-50 p-4 border border-rose-100">
                  <p className="text-xs text-rose-700 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> Mensagem de Erro
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded bg-white p-3 border border-rose-100">
                    <p className="whitespace-pre-wrap font-mono text-xs text-rose-900 leading-relaxed">
                      {selectedRun.errorMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setSelectedRun(null)}
                className="rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

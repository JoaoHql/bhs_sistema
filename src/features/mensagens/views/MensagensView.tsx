import { useEffect, useMemo, useState } from 'react';
import { WhatsAppDispatchesTemplate, adaptGelobelAutomation, adaptGelobelExecutionLog, buildGelobelWhatsAppDispatchesData, buildMockWhatsAppDispatchesData } from '../../templates/whatsapp-dispatches';
import type { WhatsAppDispatch, WhatsAppDispatchLog } from '../../templates/whatsapp-dispatches';
import { whatsappApi } from '../../../services/whatsappApi';
import type { WhatsAppAutomationApi, WhatsAppBootstrapApi, WhatsAppAutomationStatus, WhatsAppExecutionLogApi, WhatsAppTestSendResponseApi } from '../../../services/whatsappApi';
import { useDashboard } from '../../../store/dashboardStore';
import { ApiClientError } from '../../../services/apiClient';

const TenantMensagensView = () => {
  const [bootstrap, setBootstrap] = useState<WhatsAppBootstrapApi | null>(null);
  const [automations, setAutomations] = useState<WhatsAppAutomationApi[]>([]);
  const [logs, setLogs] = useState<WhatsAppExecutionLogApi[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [nextBootstrap, nextAutomations] = await Promise.all([
          whatsappApi.bootstrap(),
          whatsappApi.listAutomations(),
        ]);
        const nextLogs = (await Promise.all(nextAutomations.map(async (automation) => {
          try {
            return await whatsappApi.listExecutionLogs(automation.id);
          } catch {
            return [];
          }
        }))).flat();
        if (!cancelled) {
          setBootstrap(nextBootstrap);
          setAutomations(nextAutomations);
          setLogs(nextLogs);
        }
      } catch {
        if (!cancelled) setError('Nao foi possivel carregar as automacoes do WhatsApp.');
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(
    () => bootstrap ? buildGelobelWhatsAppDispatchesData(bootstrap, automations, logs) : null,
    [automations, bootstrap, logs],
  );

  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{error}</div>;
  if (!data || !bootstrap) return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">Carregando automacoes...</div>;

  const changeStatus = async (dispatch: WhatsAppDispatch, status: Exclude<WhatsAppAutomationStatus, 'draft'>) => {
    const source = automations.find((item) => item.id === dispatch.id);
    if (!source) throw new Error('Automacao indisponivel.');
    const updated = await whatsappApi.setAutomationStatus(source, status);
    setAutomations((current) => current.map((item) => item.id === updated.id ? updated : item));
    return adaptGelobelAutomation(updated, bootstrap);
  };

  const saveAutomation = async (dispatch: WhatsAppDispatch) => {
    const source = automations.find((item) => item.id === dispatch.id);
    if (!source) throw new Error('Automacao indisponivel.');
    const updated = await whatsappApi.replaceAutomation({
      ...source,
      name: dispatch.name,
      message_template: dispatch.template,
      local_times: dispatch.schedule,
      recipient_membership_ids: dispatch.recipientIds ?? [],
    });
    setAutomations((current) => current.map((item) => item.id === updated.id ? updated : item));
    return adaptGelobelAutomation(updated, bootstrap);
  };

  const createAutomation = async (dispatch: WhatsAppDispatch) => {
    const created = await whatsappApi.createAutomation({
      name: dispatch.name,
      message_template: dispatch.template,
      status: dispatch.status,
      local_times: dispatch.schedule.map((time) => `${time}:00`),
      recipient_membership_ids: dispatch.recipientIds ?? [],
    });
    setAutomations((current) => [created, ...current]);
    return adaptGelobelAutomation(created, bootstrap);
  };

  const deleteAutomation = async (dispatch: WhatsAppDispatch) => {
    await whatsappApi.deleteAutomation(dispatch.id);
    setAutomations((current) => current.filter((item) => item.id !== dispatch.id));
    setLogs((current) => current.filter((log) => log.dispatch_id !== dispatch.id));
  };

  const deleteLog = async (dispatch: WhatsAppDispatch, log: WhatsAppDispatchLog) => {
    await whatsappApi.deleteExecutionLog(dispatch.id, log.id);
    setLogs((current) => current.filter((item) => item.id !== log.id));
  };

  const sendTest = async (dispatch: WhatsAppDispatch, message: string): Promise<WhatsAppDispatchLog> => {
    let sent: WhatsAppTestSendResponseApi;
    try {
      sent = await whatsappApi.sendTest(dispatch.id, message);
    } catch (error) {
      if (error instanceof ApiClientError && typeof error.payload === 'object' && error.payload && 'message' in error.payload) {
        throw new Error(String(error.payload.message));
      }
      throw error;
    }
    const nextLogs = await whatsappApi.listExecutionLogs(dispatch.id);
    setLogs((current) => [...current.filter((log) => log.dispatch_id !== dispatch.id), ...nextLogs]);
    const entry = nextLogs.find((log) => log.execution_id === sent.execution_id);
    if (!entry) throw new Error(sent.error ?? 'Não foi possível obter o status do envio.');
    return adaptGelobelExecutionLog(entry);
  };

  const initialDispatches = data.initialDispatches.length ? data.initialDispatches : [{
    id: `dispatch-${Date.now()}`,
    name: 'Nova mensagem',
    status: 'draft' as const,
    recipients: [],
    recipientIds: [],
    schedule: ['09:00'],
    nextRun: 'Não agendado',
    lastRun: 'Nunca',
    template: '',
    filters: [],
  }];

  return <WhatsAppDispatchesTemplate {...data} initialDispatches={initialDispatches} onStatusChange={changeStatus} onCreate={createAutomation} onSave={saveAutomation} onDelete={deleteAutomation} onDeleteLog={deleteLog} onSendTest={sendTest} />;
};

export const MensagensView = () => {
  const { currentUser } = useDashboard();
  return currentUser?.is_staff
    ? <WhatsAppDispatchesTemplate {...buildMockWhatsAppDispatchesData()} />
    : <TenantMensagensView />;
};

import { useMemo, useState } from 'react';
import { BellRing, CalendarClock, Check, ChevronRight, CirclePause, Copy, Edit3, FileText, History, MessageCircle, Play, Plus, Send, Sparkles, Trash2, Users, X } from 'lucide-react';
import type { DispatchStatus, WhatsAppDispatch, WhatsAppDispatchesTemplateData } from './types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

const statusStyle: Record<DispatchStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusLabel: Record<DispatchStatus, string> = { active: 'Ativa', paused: 'Pausada', draft: 'Rascunho' };

export const WhatsAppDispatchesTemplate = ({ mode = 'mock', metrics, initialDispatches, initialLogs, availableRecipients = [], onStatusChange, onCreate, onSave, onDelete, onDeleteLog, onSendTest }: WhatsAppDispatchesTemplateData) => {
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [logs, setLogs] = useState(initialLogs);
  const [selectedId, setSelectedId] = useState(initialDispatches[0].id);
  const [draft, setDraft] = useState(initialDispatches[0]);
  const [metricKey, setMetricKey] = useState(metrics[0].key);
  const [notice, setNotice] = useState('');
  const [statusPending, setStatusPending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'automation' | 'log'; id: string; label: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const selected = dispatches.find((item) => item.id === selectedId) ?? dispatches[0];
  const renderedMessage = useMemo(
    () => metrics.reduce((text, metric) => text.replaceAll(`{{${metric.key}}}`, metric.value), draft.template),
    [draft.template, metrics],
  );

  const chooseDispatch = (item: WhatsAppDispatch) => {
    setSelectedId(item.id);
    setDraft(item);
    setNotice('');
  };

  const addMetric = () => setDraft((current) => ({
    ...current,
    template: `${current.template}${current.template.endsWith('\n') ? '' : '\n'}{{${metricKey}}}`,
  }));

  const addSchedule = () => {
    if (draft.schedule.includes(scheduleTime)) {
      setNotice('Este horário já foi adicionado.');
      return;
    }
    setDraft((current) => ({ ...current, schedule: [...current.schedule, scheduleTime].sort() }));
  };

  const removeSchedule = (time: string) => {
    if (draft.schedule.length === 1) {
      setNotice('A automação precisa de pelo menos um horário.');
      return;
    }
    setDraft((current) => ({ ...current, schedule: current.schedule.filter((item) => item !== time) }));
  };

  const save = async () => {
    if (!draft.recipients.length) {
      setNotice('Selecione pelo menos um destinatário.');
      return;
    }
    if (!onSave) {
      setDispatches((current) => current.map((item) => item.id === draft.id ? draft : item));
      setNotice('Alterações salvas nesta demonstração.');
      return;
    }
    setSavePending(true);
    setNotice('Salvando automação...');
    try {
      const isNew = draft.id.startsWith('dispatch-');
      const updated = isNew && onCreate ? await onCreate(draft) : await onSave(draft);
      setDraft(updated);
      setDispatches((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice('Automação salva.');
    } catch {
      setNotice('Não foi possível salvar. O estado anterior foi mantido.');
    } finally {
      setSavePending(false);
    }
  };

  const selectedRecipientIds = draft.recipientIds ?? availableRecipients
    .filter((recipient) => draft.recipients.includes(recipient.name))
    .map((recipient) => recipient.id);

  const toggleRecipient = (recipientId: string) => {
    const nextIds = selectedRecipientIds.includes(recipientId)
      ? selectedRecipientIds.filter((id) => id !== recipientId)
      : [...selectedRecipientIds, recipientId];
    setDraft((current) => ({
      ...current,
      recipientIds: nextIds,
      recipients: availableRecipients.filter((recipient) => nextIds.includes(recipient.id)).map((recipient) => recipient.name),
    }));
  };

  const generateReadyMessage = (period: 'Diario' | 'Mensal' | 'Anual') => {
    const periodMetrics = metrics.filter((metric) => metric.category === period).slice(0, 5);
    if (!periodMetrics.length) {
      setNotice(`Não há dados ${period.toLowerCase()}s disponíveis para gerar a mensagem.`);
      return;
    }
    const heading = period === 'Diario' ? 'Resumo diário' : period === 'Mensal' ? 'Resumo mensal' : 'Resumo anual';
    const lines = periodMetrics.map((metric) => `• ${metric.label}: {{${metric.key}}}`);
    setDraft((current) => ({
      ...current,
      name: current.name === 'Nova mensagem' ? heading : current.name,
      template: `Olá!\n\n📊 *${heading}*\n${lines.join('\n')}\n\nDados atualizados automaticamente no momento do envio.`,
    }));
    setNotice(`Mensagem ${period.toLowerCase()} pronta para revisão.`);
  };

  const toggleStatus = async () => {
    const status: DispatchStatus = draft.status === 'active' ? 'paused' : 'active';
    if (!onStatusChange) {
      const updated = { ...draft, status, nextRun: status === 'active' ? 'Hoje, 17:30' : 'Pausado' };
      setDraft(updated);
      setDispatches((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(status === 'active' ? 'Automação ativada no mock.' : 'Automação pausada no mock.');
      return;
    }
    setStatusPending(true);
    setNotice('Atualizando status...');
    try {
      const updated = await onStatusChange(draft, status);
      setDraft(updated);
      setDispatches((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(status === 'active' ? 'Automação ativada.' : 'Automação pausada.');
    } catch {
      setNotice('Não foi possível atualizar o status. O estado anterior foi mantido.');
    } finally {
      setStatusPending(false);
    }
  };

  const sendTest = async () => {
    if (onSendTest) {
      setTestPending(true);
      setNotice('Enviando teste para o telefone do MASTER...');
      try {
        const log = await onSendTest(draft, draft.template);
        setLogs((current) => [log, ...current.filter((item) => item.id !== log.id)]);
        setNotice(log.status === 'sent' ? 'Teste enviado ao WhatsApp do MASTER.' : log.status === 'pending' ? 'Teste ja esta sendo processado.' : `Falha no envio: ${log.error ?? 'erro do provedor.'}`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Não foi possível enviar o teste.');
      } finally {
        setTestPending(false);
      }
      return;
    }
    setLogs((current) => [{ id: `test-${Date.now()}`, dispatchId: draft.id, recipient: 'Seu número de teste', sentAt: 'Agora', status: 'test', summary: `${draft.name} · teste simulado` }, ...current]);
    setNotice('Teste registrado no histórico. Nenhuma mensagem foi enviada ao WhatsApp.');
  };

  const createDispatch = () => {
    const next: WhatsAppDispatch = {
      id: `dispatch-${Date.now()}`, name: 'Nova mensagem', status: 'draft', recipients: [], recipientIds: [], schedule: ['09:00'], nextRun: 'Não agendado', lastRun: 'Nunca', template: '', filters: [],
    };
    setDispatches((current) => [next, ...current]);
    chooseDispatch(next);
    setNotice('Nova automação criada como rascunho.');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      if (deleteTarget.kind === 'automation') {
        if (onDelete) await onDelete(draft);
        setDispatches((current) => current.filter((item) => item.id !== draft.id));
        setLogs((current) => current.filter((item) => item.dispatchId !== draft.id));
        const next = dispatches.find((item) => item.id !== draft.id);
        if (next) chooseDispatch(next);
        setNotice('Automação apagada.');
      } else {
        const log = logs.find((item) => item.id === deleteTarget.id);
        if (log && onDeleteLog) await onDeleteLog(draft, log);
        setLogs((current) => current.filter((item) => item.id !== deleteTarget.id));
        setNotice('Registro de disparo apagado.');
      }
      setDeleteTarget(null);
    } catch {
      setNotice('Não foi possível apagar o item. O estado anterior foi mantido.');
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[1600px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><MessageCircle className="h-5 w-5" /></div>
          <div><div className="flex items-center gap-2"><h1 className="text-lg font-extrabold tracking-tight text-slate-900">Disparos no WhatsApp</h1><span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${mode === 'production' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>{mode === 'production' ? 'Produção' : 'Mock'}</span></div><p className="mt-1 text-xs text-slate-500">Configure resumos automáticos com métricas e filtros controlados.</p></div>
        </div>
        <button type="button" onClick={createDispatch} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-emerald-700"><Plus className="h-4 w-4" />Nova automação</button>
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700"><span>{notice}</span><button type="button" onClick={() => setNotice('')}><X className="h-4 w-4" /></button></div>}

      <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Automações</h2><p className="mt-0.5 text-[10px] text-slate-400">{dispatches.length} configuradas</p></div></div>
          <div className="divide-y divide-slate-100">{dispatches.map((item) => <button type="button" key={item.id} onClick={() => chooseDispatch(item)} className={`w-full px-4 py-4 text-left transition-colors hover:bg-slate-50 ${item.id === selected.id ? 'border-l-2 border-emerald-500 bg-emerald-50/40 pl-[14px]' : ''}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{item.name}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="h-3 w-3" />{item.schedule.join(' · ')}</p></div><span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${statusStyle[item.status]}`}>{statusLabel[item.status]}</span></div><p className="mt-3 text-[10px] text-slate-500">Próximo: <strong className="font-semibold text-slate-700">{item.nextRun}</strong></p></button>)}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><div className="rounded-lg bg-slate-100 p-2 text-slate-500"><Edit3 className="h-4 w-4" /></div><div><h2 className="text-sm font-extrabold text-slate-900">Editor da mensagem</h2><p className="text-[10px] text-slate-400">{mode === 'production' ? 'Automação vinculada ao tenant.' : 'Dados demonstrativos; nenhum envio real.'}</p></div></div><div className="flex gap-2"><button type="button" disabled={statusPending} onClick={() => void toggleStatus()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition-opacity hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50">{draft.status === 'active' ? <CirclePause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{draft.status === 'active' ? 'Pausar' : 'Ativar'}</button><button type="button" disabled={savePending} onClick={() => void save()} className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50">{savePending ? 'Salvando...' : 'Salvar'}</button><button type="button" onClick={() => setDeleteTarget({ kind: 'automation', id: draft.id, label: draft.name })} className="rounded-lg border border-rose-200 px-2.5 text-rose-600 hover:bg-rose-50" title="Apagar automação" aria-label="Apagar automação"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
          <div className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Nome da automação<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-400" /></label><div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Horários <div className="mt-1.5 flex flex-wrap gap-1.5">{draft.schedule.map((time) => <button type="button" key={time} onClick={() => removeSchedule(time)} title="Remover horário" className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-rose-200 hover:text-rose-600">{time} ×</button>)}<input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} className="rounded-md border border-slate-200 px-2 text-xs text-slate-700 outline-none focus:border-emerald-400" /><button type="button" onClick={addSchedule} className="rounded-md border border-dashed border-slate-300 px-2 text-slate-500 hover:border-emerald-300 hover:text-emerald-700" title="Adicionar horário"><Plus className="h-3.5 w-3.5" /></button></div></div></div>
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3"><div className="mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-600" /><span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-800">Gerar mensagem pronta</span></div><p className="mb-3 text-[10px] leading-4 text-violet-700">Monta um texto com os dados disponíveis. Você revisa antes de salvar.</p><div className="grid grid-cols-3 gap-2">{(['Diario', 'Mensal', 'Anual'] as const).map((period) => <button key={period} type="button" onClick={() => generateReadyMessage(period)} className="rounded-lg border border-violet-200 bg-white px-2 py-2 text-[10px] font-bold text-violet-700 hover:bg-violet-100">{period === 'Diario' ? 'Diária' : period}</button>)}</div></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-500" /><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">Inserir dado disponível</span></div><div className="flex flex-col gap-2 sm:flex-row"><select value={metricKey} onChange={(event) => setMetricKey(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none">{metrics.map((metric) => <option key={metric.key} value={metric.key}>{metric.category} · {metric.label}</option>)}</select><button type="button" onClick={addMetric} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700 hover:bg-violet-100"><Plus className="h-3.5 w-3.5" />Adicionar token</button></div></div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Texto da mensagem<textarea value={draft.template} onChange={(event) => setDraft({ ...draft, template: event.target.value })} placeholder="Insira o conteúdo da mensagem" rows={11} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400" /></label>
            <div className="rounded-xl border border-slate-100 p-3"><div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" />Destinatários</div><div className="mt-2 flex flex-wrap gap-1.5">{draft.recipients.map((recipient) => <span key={recipient} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{recipient}</span>)}{!draft.recipients.length && <span className="text-[10px] text-slate-400">Nenhum selecionado</span>}<button type="button" onClick={() => setRecipientOpen(true)} className="rounded-full border border-dashed border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700">+ adicionar</button></div></div>
          </div>
        </section>

        <aside className="space-y-5"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Prévia atualizada</h2><p className="mt-0.5 text-[10px] text-slate-400">Valores fictícios atualizados agora</p></div><BellRing className="h-4 w-4 text-emerald-500" /></div><div className="bg-[#e7f9ee] p-4"><div className="mx-auto max-w-[285px] rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-bold text-emerald-700">BHS Inteligente</span><span className="text-[9px] text-slate-400">agora</span></div><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{renderedMessage}</p><div className="mt-1 text-right text-[9px] text-emerald-500">✓✓</div></div></div><div className="flex gap-2 p-3"><button type="button" disabled={testPending} onClick={() => void sendTest()} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><Send className="h-3.5 w-3.5" />{testPending ? 'Enviando...' : onSendTest ? 'Enviar teste ao MASTER' : 'Registrar teste'}</button><button type="button" onClick={() => { void navigator.clipboard?.writeText(renderedMessage); setNotice('Prévia copiada.'); }} className="rounded-lg border border-slate-200 px-3 text-slate-500 hover:bg-slate-50" title="Copiar prévia"><Copy className="h-3.5 w-3.5" /></button></div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-1.5"><History className="h-4 w-4 text-slate-400" /><h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Execuções</h2></div><button type="button" onClick={() => setHistoryOpen(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700">Ver tudo</button></div><div className="space-y-3">{logs.filter((log) => log.dispatchId === draft.id).slice(0, 3).map((log) => <div key={log.id} className="flex gap-2"><span className={`mt-0.5 h-2 w-2 rounded-full ${log.status === 'failed' ? 'bg-rose-500' : log.status === 'test' ? 'bg-blue-500' : log.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-700">{log.summary}</p><p className="mt-0.5 text-[9px] text-slate-400">{log.recipient} · {log.sentAt}</p></div><ChevronRight className="h-3.5 w-3.5 text-slate-300" /></div>)}{!logs.some((log) => log.dispatchId === draft.id) && <p className="py-2 text-center text-[10px] font-medium text-slate-400">Sem execuções ainda.</p>}</div></section></aside>
      </div>

      <Dialog open={recipientOpen} onOpenChange={setRecipientOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 pr-12">
            <DialogTitle className="text-base font-bold text-slate-900">Adicionar destinatários</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">Selecione quem receberá esta automação.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[360px] space-y-2 overflow-y-auto p-4">
            {availableRecipients.map((recipient) => {
              const selectedRecipient = selectedRecipientIds.includes(recipient.id);
              return <button key={recipient.id} type="button" onClick={() => toggleRecipient(recipient.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selectedRecipient ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${selectedRecipient ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>{selectedRecipient && <Check className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-xs font-bold text-slate-800">{recipient.name}{recipient.isMaster && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[8px] font-extrabold text-violet-700">MASTER</span>}</span><span className={`mt-1 block text-[10px] ${recipient.phone ? 'text-slate-500' : 'font-semibold text-amber-600'}`}>{recipient.phone ?? 'Telefone não configurado em Minha conta'}</span></span></button>;
            })}
            {!availableRecipients.length && <p className="py-8 text-center text-xs text-slate-500">Nenhum destinatário disponível.</p>}
          </div>
          <DialogFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <span className="text-[10px] font-semibold text-slate-500">{selectedRecipientIds.length} selecionado(s)</span>
            <button type="button" onClick={() => setRecipientOpen(false)} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Concluir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 pr-12">
            <DialogTitle className="text-base font-bold text-slate-900">Histórico de execuções</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">{draft.name} · registros de envio e falha mais recentes.</DialogDescription>
          </DialogHeader>
          <div className="data-table-scroll max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {logs.filter((log) => log.dispatchId === draft.id).map((log) => {
              const tone = log.status === 'failed' ? 'bg-rose-50 text-rose-700' : log.status === 'pending' ? 'bg-amber-50 text-amber-700' : log.status === 'test' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700';
              const label = log.status === 'failed' ? 'Falhou' : log.status === 'pending' ? 'Pendente' : log.status === 'test' ? 'Teste' : 'Enviado';
              return <div key={log.id} className="flex gap-4 px-6 py-4"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><History className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-slate-800">{log.recipient}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${tone}`}>{label}</span>{log.message && <span title={log.message} className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Ver conteúdo enviado"><FileText className="h-3.5 w-3.5" /></span>}</div><p className="mt-1 text-xs text-slate-500">{log.summary}</p>{log.error && <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[10px] font-semibold text-rose-700">{log.error}</p>}</div><div className="flex shrink-0 items-start gap-2"><time className="text-[10px] text-slate-400">{log.sentAt}</time><button type="button" onClick={() => setDeleteTarget({ kind: 'log', id: log.id, label: log.summary })} className="text-slate-300 hover:text-rose-600" title="Apagar registro" aria-label="Apagar registro"><Trash2 className="h-3.5 w-3.5" /></button></div></div>;
            })}
            {!logs.some((log) => log.dispatchId === draft.id) && <div className="px-6 py-14 text-center"><History className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Sem histórico ainda.</p><p className="mt-1 text-xs text-slate-400">Os resultados dos testes enviados aparecerão aqui.</p></div>}
          </div>
          <DialogFooter className="justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button type="button" onClick={() => setHistoryOpen(false)} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Fechar</button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>{deleteTarget?.kind === 'automation' ? `A automação “${deleteTarget.label}” e seu histórico serão apagados.` : `O registro “${deleteTarget?.label}” será apagado do histórico.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" disabled={deletePending} onClick={() => void confirmDelete()} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">{deletePending ? 'Apagando...' : 'Apagar'}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

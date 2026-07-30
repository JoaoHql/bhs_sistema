import type { WhatsAppAutomationApi, WhatsAppBootstrapApi, WhatsAppExecutionLogApi } from '../../../../services/whatsappApi';
import type { WhatsAppDispatch, WhatsAppDispatchesTemplateData, WhatsAppDispatchLog, WhatsAppMetricToken } from '../types';

const category = (period: 'daily' | 'monthly' | 'yearly'): WhatsAppMetricToken['category'] => {
  if (period === 'daily') return 'Diario';
  if (period === 'monthly') return 'Mensal';
  return 'Anual';
};

export const adaptGelobelAutomation = (
  automation: WhatsAppAutomationApi,
  bootstrap: WhatsAppBootstrapApi,
): WhatsAppDispatch => {
  const names = new Map(bootstrap.recipients.map((item) => [item.membership_id, item.name]));
  const schedule = automation.local_times.map((value) => value.slice(0, 5));
  return {
    id: automation.id,
    name: automation.name,
    status: automation.status,
    recipients: automation.recipient_membership_ids.map((id) => names.get(id) ?? 'Usuario indisponivel'),
    recipientIds: automation.recipient_membership_ids,
    schedule,
    nextRun: automation.status === 'active' ? `${schedule[0]} · ${bootstrap.timezone}` : 'Pausado',
    lastRun: 'Sem execucao registrada',
    template: automation.message_template,
    filters: [],
  };
};

export const adaptGelobelExecutionLog = (log: WhatsAppExecutionLogApi): WhatsAppDispatchLog => ({
  id: log.id,
  dispatchId: log.dispatch_id,
  recipient: log.recipient,
  sentAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.sent_at)),
  status: log.status,
  summary: log.summary,
  message: log.message,
  error: log.error,
});

export const buildGelobelWhatsAppDispatchesData = (
  bootstrap: WhatsAppBootstrapApi,
  automations: WhatsAppAutomationApi[],
  logs: WhatsAppExecutionLogApi[] = [],
): WhatsAppDispatchesTemplateData => ({
  mode: 'production',
  metrics: bootstrap.variable_groups.flatMap((group) => group.variables.map((variable) => ({
    key: variable.key,
    label: variable.display_name,
    description: variable.description,
    category: category(group.period),
    value: 'Atualizado no envio',
  }))),
  initialDispatches: automations.map((automation) => adaptGelobelAutomation(automation, bootstrap)),
  initialLogs: logs.map(adaptGelobelExecutionLog),
  availableRecipients: bootstrap.recipients.map((recipient) => ({
    id: recipient.membership_id,
    name: recipient.name,
    phone: recipient.phone_e164,
    isMaster: recipient.is_master,
  })),
});

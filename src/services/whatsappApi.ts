import { apiClient } from './apiClient';

export type WhatsAppAutomationStatus = 'draft' | 'active' | 'paused';

export interface WhatsAppAutomationApi {
  id: string;
  name: string;
  message_template: string;
  status: WhatsAppAutomationStatus;
  local_times: string[];
  recipient_membership_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface WhatsAppBootstrapApi {
  timezone: string;
  variable_groups: Array<{
    period: 'daily' | 'monthly' | 'yearly';
    variables: Array<{ key: string; display_name: string; description: string }>;
  }>;
  recipients: Array<{ membership_id: string; name: string; phone_e164: string | null; is_master: boolean }>;
}

export interface WhatsAppExecutionLogApi {
  id: string;
  execution_id: string;
  dispatch_id: string;
  recipient: string;
  sent_at: string;
  status: 'sent' | 'failed' | 'pending' | 'test';
  summary: string;
  message?: string | null;
  error?: string | null;
}

export interface WhatsAppTestSendResponseApi {
  execution_id: string;
  status: 'pending' | 'sent' | 'failed';
  provider_message_id?: string | null;
  error?: string | null;
}

const writePayload = (automation: WhatsAppAutomationApi, status: WhatsAppAutomationStatus = automation.status) => ({
  name: automation.name,
  message_template: automation.message_template,
  status,
  local_times: automation.local_times,
  recipient_membership_ids: automation.recipient_membership_ids,
});

export const whatsappApi = {
  bootstrap: () => apiClient.get<WhatsAppBootstrapApi>('/api/v1/tenant/whatsapp/bootstrap'),
  listAutomations: () => apiClient.get<WhatsAppAutomationApi[]>('/api/v1/tenant/whatsapp/automations'),
  createAutomation: (automation: Omit<WhatsAppAutomationApi, 'id' | 'created_at' | 'updated_at'>) =>
    apiClient.post<ReturnType<typeof writePayload>, WhatsAppAutomationApi>('/api/v1/tenant/whatsapp/automations', writePayload(automation as WhatsAppAutomationApi)),
  listExecutionLogs: (automationId: string) => apiClient.get<WhatsAppExecutionLogApi[]>(`/api/v1/tenant/whatsapp/automations/${encodeURIComponent(automationId)}/executions`),
  deleteExecutionLog: (automationId: string, deliveryId: string) => apiClient.delete<void>(`/api/v1/tenant/whatsapp/automations/${encodeURIComponent(automationId)}/executions/${encodeURIComponent(deliveryId)}`),
  sendTest: (automationId: string, message: string) => apiClient.post<{ message: string }, WhatsAppTestSendResponseApi>(
    `/api/v1/tenant/whatsapp/automations/${encodeURIComponent(automationId)}/send-test`,
    { message },
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  ),
  setAutomationStatus: (automation: WhatsAppAutomationApi, status: WhatsAppAutomationStatus) =>
    apiClient.put<ReturnType<typeof writePayload>, WhatsAppAutomationApi>(
      `/api/v1/tenant/whatsapp/automations/${encodeURIComponent(automation.id)}`,
      writePayload(automation, status),
    ),
  replaceAutomation: (automation: WhatsAppAutomationApi) =>
    apiClient.put<ReturnType<typeof writePayload>, WhatsAppAutomationApi>(
      `/api/v1/tenant/whatsapp/automations/${encodeURIComponent(automation.id)}`,
      writePayload(automation),
    ),
  deleteAutomation: (automationId: string) => apiClient.delete<void>(`/api/v1/tenant/whatsapp/automations/${encodeURIComponent(automationId)}`),
};

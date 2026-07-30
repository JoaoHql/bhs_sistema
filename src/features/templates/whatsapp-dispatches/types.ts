export type DispatchStatus = 'active' | 'paused' | 'draft';

export interface WhatsAppMetricToken {
  key: string;
  label: string;
  description: string;
  category: 'Diario' | 'Mensal' | 'Anual' | 'Comparacao';
  value: string;
}

export interface WhatsAppDispatch {
  id: string;
  name: string;
  status: DispatchStatus;
  recipients: string[];
  recipientIds?: string[];
  schedule: string[];
  nextRun: string;
  lastRun: string;
  template: string;
  filters: string[];
}

export interface WhatsAppAvailableRecipient {
  id: string;
  name: string;
  phone: string | null;
  isMaster: boolean;
}

export interface WhatsAppDispatchLog {
  id: string;
  dispatchId: string;
  recipient: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending' | 'test';
  summary: string;
  message?: string | null;
  error?: string | null;
}

export interface WhatsAppDispatchesTemplateData {
  mode?: 'mock' | 'production';
  metrics: WhatsAppMetricToken[];
  initialDispatches: WhatsAppDispatch[];
  initialLogs: WhatsAppDispatchLog[];
  availableRecipients?: WhatsAppAvailableRecipient[];
  onStatusChange?: (dispatch: WhatsAppDispatch, status: Exclude<DispatchStatus, 'draft'>) => Promise<WhatsAppDispatch>;
  onCreate?: (dispatch: WhatsAppDispatch) => Promise<WhatsAppDispatch>;
  onSave?: (dispatch: WhatsAppDispatch) => Promise<WhatsAppDispatch>;
  onDelete?: (dispatch: WhatsAppDispatch) => Promise<void>;
  onDeleteLog?: (dispatch: WhatsAppDispatch, log: WhatsAppDispatchLog) => Promise<void>;
  onSendTest?: (dispatch: WhatsAppDispatch, message: string) => Promise<WhatsAppDispatchLog>;
}

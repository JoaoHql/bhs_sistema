import { useState, type FormEvent } from 'react';
import { CircleUserRound, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { configApi, isConfigApiEnabled } from '../../services/configApi';
import type { BackendUser } from '../../types';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: BackendUser;
  onSaved: (user: BackendUser) => void;
}

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;
  return `+${digits}`;
};

export const AccountDialog = ({ open, onOpenChange, user, onSaved }: AccountDialogProps) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.whatsapp_phone_e164 ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const canConfigureWhatsApp = !user.is_staff && user.roles.includes('admin');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const whatsapp_phone_e164 = canConfigureWhatsApp ? normalizePhone(phone) : user.whatsapp_phone_e164 ?? null;
    if (whatsapp_phone_e164 && !/^\+[1-9][0-9]{7,14}$/.test(whatsapp_phone_e164)) {
      setFeedback('Informe o telefone com DDI e DDD. Ex.: +5571999999999.');
      return;
    }
    setSaving(true);
    setFeedback('');
    try {
      const updated = isConfigApiEnabled()
        ? await configApi.updateProfile({ name: name.trim(), whatsapp_phone_e164 })
        : { ...user, name: name.trim(), whatsapp_phone_e164 };
      onSaved(updated);
      setFeedback('Conta atualizada.');
    } catch {
      setFeedback('Não foi possível salvar. Seus dados anteriores foram mantidos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <div className="grid min-h-[500px] md:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/80 p-5 md:border-b-0 md:border-r">
            <DialogHeader className="pr-7">
              <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">Minha conta</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 text-slate-500">Perfil e preferências pessoais.</DialogDescription>
            </DialogHeader>
            <div className="mt-6 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-slate-900 shadow-sm ring-1 ring-slate-200">
              <span className="flex items-center gap-2"><CircleUserRound className="h-4 w-4" />Perfil</span>
            </div>
          </aside>

          <form onSubmit={submit} className="flex min-w-0 flex-col">
            <div className="flex-1 space-y-6 p-6 pt-8 md:p-8">
              <div>
                <h3 className="text-base font-bold text-slate-900">Perfil</h3>
                <p className="mt-1 text-xs text-slate-500">Informações usadas para identificar sua conta.</p>
              </div>

              <label className="block text-xs font-bold text-slate-700">Nome
                <input required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              </label>

              <label className="block text-xs font-bold text-slate-700">E-mail
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-500"><Mail className="h-4 w-4" />{user.email}</div>
              </label>

              <label className="block text-xs font-bold text-slate-700">Telefone para WhatsApp
                <div className="relative mt-2"><Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" /><input disabled={!canConfigureWhatsApp} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+55 71 99999-9999" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 disabled:bg-slate-50 disabled:text-slate-400" /></div>
                <span className="mt-2 flex items-start gap-1.5 text-[11px] font-normal leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{canConfigureWhatsApp ? 'Os disparos destinados ao MASTER serão enviados para este número.' : 'Disponível para o administrador MASTER do cliente.'}</span>
              </label>

              {feedback && <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${feedback === 'Conta atualizada.' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{feedback}</p>}
            </div>
            <DialogFooter className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 md:px-8">
              <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={saving || name.trim().length < 2} className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

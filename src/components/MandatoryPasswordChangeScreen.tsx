import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { ApiClientError } from '../services/apiClient';
import { configApi } from '../services/configApi';
import { useDashboard } from '../store/dashboardStore';

const passwordChecks = (password: string) => [
  { label: '10 ou mais caracteres', valid: password.length >= 10 },
  { label: 'Letra maiúscula', valid: /[A-Z]/.test(password) },
  { label: 'Letra minúscula', valid: /[a-z]/.test(password) },
  { label: 'Número', valid: /\d/.test(password) },
  { label: 'Caractere especial', valid: [...password].some((char) => '!@#$%^&*()-_=+[]{}:,.?'.includes(char)) },
];

export function MandatoryPasswordChangeScreen() {
  const { currentUser, setCurrentUser, setCurrentTab } = useDashboard();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = passwordChecks(password);
  const valid = checks.every((item) => item.valid) && password === confirmation;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setError(password !== confirmation ? 'As senhas não coincidem.' : 'A nova senha ainda não atende à política.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await configApi.changePassword({ newPassword: password });
      localStorage.setItem('bhs_auth_token', response.access_token);
      setCurrentUser(response.user);
      setCurrentTab(response.user.is_staff || response.user.roles.includes('admin') ? 'configuracoes' : '');
      setPassword('');
      setConfirmation('');
    } catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.payload && typeof requestError.payload === 'object') {
        const payload = requestError.payload as { detail?: string; message?: string };
        setError(payload.detail ?? payload.message ?? 'Não foi possível alterar a senha.');
      } else {
        setError('Não foi possível alterar a senha.');
      }
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bhs_auth_token');
    setCurrentTab('');
    setCurrentUser(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute left-[-10%] top-[-20%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-7 flex items-start gap-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400"><KeyRound className="h-6 w-6" /></div>
          <div><h1 className="text-xl font-extrabold text-white">Defina sua nova senha</h1><p className="mt-1 text-sm leading-6 text-slate-400">A senha atual é temporária. Nenhuma outra tela fica acessível até concluir esta troca.</p></div>
        </div>
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400"><span className="font-bold text-slate-200">{currentUser?.name}</span><span className="mx-2">·</span>{currentUser?.email}</div>
        {error && <div className="mb-5 flex gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300"><ShieldAlert className="h-5 w-5 shrink-0" />{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Nova senha
            <div className="relative mt-2"><input required autoFocus type={visible ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-11 text-sm text-white outline-none focus:border-blue-500" /><button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-3 top-3 text-slate-500" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Confirmar nova senha<input required type={visible ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500" /></label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px]">{checks.map((item) => <span key={item.label} className={`flex items-center gap-1.5 ${item.valid ? 'text-emerald-400' : 'text-slate-500'}`}><Check className="h-3.5 w-3.5" />{item.label}</span>)}</div>
          <button disabled={saving || !valid} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar nova senha e continuar</button>
          <button type="button" onClick={logout} className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-300">Sair da conta</button>
        </form>
      </div>
    </div>
  );
}

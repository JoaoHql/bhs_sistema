import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Pencil,
  Power, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { ApiClientError } from '../../../services/apiClient';
import { configApi } from '../../../services/configApi';
import type {
  AppScreen, ManagedUser, PasswordMode, ScreenAccess, ScreenPermissionInput,
  TemporaryPasswordRequest,
} from '../../../types';

type StatusFilter = 'all' | 'active' | 'inactive';
type PasswordDraft = { mode: PasswordMode; password: string };
type Credential = { title: string; password: string; expiresAt: string };
type PendingAction = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
};

const emptyPassword: PasswordDraft = { mode: 'generated', password: '' };

const checksFor = (password: string) => [
  { label: '10 ou mais caracteres', valid: password.length >= 10 },
  { label: 'Letra maiúscula', valid: /[A-Z]/.test(password) },
  { label: 'Letra minúscula', valid: /[a-z]/.test(password) },
  { label: 'Número', valid: /\d/.test(password) },
  { label: 'Caractere especial', valid: [...password].some((char) => '!@#$%^&*()-_=+[]{}:,.?'.includes(char)) },
];

const passwordPayload = (draft: PasswordDraft): TemporaryPasswordRequest => (
  draft.mode === 'generated' ? { mode: 'generated' } : { mode: 'defined', password: draft.password }
);

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && error.payload && typeof error.payload === 'object') {
    const payload = error.payload as { message?: string; detail?: string };
    return payload.message ?? payload.detail ?? fallback;
  }
  return fallback;
};

function Modal({ title, description, children, onClose, wide = false }: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div><h3 className="text-base font-extrabold text-slate-900">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordControl({ value, onChange }: { value: PasswordDraft; onChange: (value: PasswordDraft) => void }) {
  const [visible, setVisible] = useState(false);
  const checks = checksFor(value.password);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button type="button" onClick={() => onChange(emptyPassword)} className={`rounded-md px-3 py-2 text-xs font-bold ${value.mode === 'generated' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>Gerar automaticamente</button>
        <button type="button" onClick={() => onChange({ mode: 'defined', password: '' })} className={`rounded-md px-3 py-2 text-xs font-bold ${value.mode === 'defined' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}>Definir temporária</button>
      </div>
      {value.mode === 'generated' ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">O backend gerará uma senha forte, exibida somente uma vez.</div>
      ) : (
        <>
          <label className="block text-xs font-bold text-slate-600">Senha temporária
            <div className="relative mt-1.5">
              <input required type={visible ? 'text' : 'password'} value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} autoComplete="new-password" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-orange-400" />
              <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-2.5 top-2.5 text-slate-400" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-1 text-[10px]">{checks.map((item) => <span key={item.label} className={`flex items-center gap-1 ${item.valid ? 'text-emerald-700' : 'text-slate-400'}`}><Check className="h-3 w-3" />{item.label}</span>)}</div>
        </>
      )}
    </div>
  );
}

function PermissionMatrix({ screens, value, onChange }: {
  screens: AppScreen[];
  value: ScreenPermissionInput[];
  onChange: (permissions: ScreenPermissionInput[]) => void;
}) {
  const accessByScreen = new Map(value.map((item) => [item.screenId, item.access]));
  const setAccess = (screenId: string, access: ScreenAccess) => {
    onChange([
      ...value.filter((item) => item.screenId !== screenId),
      { screenId, access },
    ].sort((a, b) => a.screenId.localeCompare(b.screenId)));
  };

  if (screens.length === 0) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Nenhuma tela publicada para este tenant.</div>;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="grid grid-cols-[1fr_150px] bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Tela publicada</span><span>Acesso</span></div>
      <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
        {screens.map((screen) => (
          <div key={screen.id} className="grid grid-cols-[1fr_150px] items-center px-3 py-2.5">
            <div><p className="text-xs font-bold text-slate-800">{screen.label}</p><p className="text-[10px] font-mono text-slate-400">{screen.id}</p></div>
            <select value={accessByScreen.get(screen.id) ?? 'none'} onChange={(event) => setAccess(screen.id, event.target.value as ScreenAccess)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-orange-400">
              <option value="none">Sem acesso</option><option value="read">Leitura</option><option value="write">Leitura e escrita</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TenantUserManagementPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [screens, setScreens] = useState<AppScreen[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState<PasswordDraft>(emptyPassword);
  const [createPermissions, setCreatePermissions] = useState<ScreenPermissionInput[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [permissionUser, setPermissionUser] = useState<ManagedUser | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<ScreenPermissionInput[]>([]);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState<PasswordDraft>(emptyPassword);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    const [userList, modules] = await Promise.all([configApi.listTenantUsers(), configApi.modules()]);
    setUsers(userList.filter((user) => !user.is_staff && !user.roles.includes('admin')));
    setScreens(modules.flatMap((module) => module.screens));
  };

  useEffect(() => {
    let active = true;
    Promise.all([configApi.listTenantUsers(), configApi.modules()])
      .then(([userList, modules]) => {
        if (!active) return;
        setUsers(userList.filter((user) => !user.is_staff && !user.roles.includes('admin')));
        setScreens(modules.flatMap((module) => module.screens));
      })
      .catch((requestError) => { if (active) setError(errorMessage(requestError, 'Não foi possível carregar os usuários.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return users.filter((user) => (statusFilter === 'all' || user.status === statusFilter)
      && (!term || [user.name, user.email].some((value) => value.toLocaleLowerCase('pt-BR').includes(term))));
  }, [search, statusFilter, users]);

  const runAndRefresh = async (action: () => Promise<void>, fallback: string) => {
    setSaving(true); setError(null); setMessage(null);
    try { await action(); await loadData(); }
    catch (requestError) { setError(errorMessage(requestError, fallback)); throw requestError; }
    finally { setSaving(false); }
  };

  const validPassword = (draft: PasswordDraft) => draft.mode === 'generated' || checksFor(draft.password).every((item) => item.valid);

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!validPassword(createPassword)) { setError('A senha temporária ainda não atende à política.'); return; }
    try {
      await runAndRefresh(async () => {
        const response = await configApi.createTenantUser({ name: createName.trim(), email: createEmail.trim(), temporaryPassword: passwordPayload(createPassword), permissions: createPermissions });
        setCredential({ title: `Credencial de ${response.user.name}`, password: response.temporaryPassword, expiresAt: response.expiresAt });
        setCreateOpen(false); setCreateName(''); setCreateEmail(''); setCreatePassword(emptyPassword); setCreatePermissions([]);
        setMessage('Usuário criado com sucesso.');
      }, 'Não foi possível criar o usuário.');
    } catch { /* erro normalizado */ }
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault(); if (!editing) return;
    try { await runAndRefresh(async () => { await configApi.updateTenantUser(editing.id, { name: editName.trim() }); setEditing(null); setMessage('Usuário atualizado.'); }, 'Não foi possível atualizar o usuário.'); }
    catch { /* erro normalizado */ }
  };

  const submitPermissions = async (event: FormEvent) => {
    event.preventDefault(); if (!permissionUser) return;
    try { await runAndRefresh(async () => { await configApi.replaceTenantUserPermissions(permissionUser.id, { permissions: permissionDraft }); setPermissionUser(null); setPermissionDraft([]); setMessage('Permissões atualizadas. A sessão anterior do usuário foi revogada.'); }, 'Não foi possível atualizar as permissões.'); }
    catch { /* erro normalizado */ }
  };

  const requestStatus = (user: ManagedUser) => {
    const activating = user.status === 'inactive';
    setPendingAction({
      title: activating ? 'Ativar usuário?' : 'Desativar usuário?',
      description: activating ? `${user.name} poderá voltar a autenticar.` : `${user.name} perderá acesso e as sessões atuais serão revogadas.`,
      confirmLabel: activating ? 'Ativar usuário' : 'Desativar usuário', destructive: !activating,
      run: async () => { await configApi.updateTenantUser(user.id, { status: activating ? 'active' : 'inactive' }); setMessage(activating ? 'Usuário ativado.' : 'Usuário desativado.'); },
    });
  };

  const requestDelete = (user: ManagedUser) => {
    setPendingAction({
      title: 'Excluir usuário?',
      description: `${user.name} perderá o acesso definitivamente. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir usuário', destructive: true,
      run: async () => { await configApi.deleteTenantUser(user.id); setMessage('Usuário excluído definitivamente.'); },
    });
  };

  const submitReset = (event: FormEvent) => {
    event.preventDefault(); if (!resetting) return;
    if (!validPassword(resetPassword)) { setError('A senha temporária ainda não atende à política.'); return; }
    const target = resetting; const password = { ...resetPassword };
    setPendingAction({ title: 'Redefinir senha?', description: `As sessões atuais de ${target.name} serão revogadas.`, confirmLabel: 'Redefinir senha', destructive: true,
      run: async () => { const response = await configApi.resetTenantUserPassword(target.id, passwordPayload(password)); setResetting(null); setResetPassword(emptyPassword); setCredential({ title: `Nova credencial de ${target.name}`, password: response.temporaryPassword, expiresAt: response.expiresAt }); setMessage('Senha temporária redefinida.'); },
    });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    try { await runAndRefresh(pendingAction.run, 'Não foi possível concluir a ação.'); setPendingAction(null); }
    catch { /* mantém confirmação */ }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Users className="h-4 w-4" />Usuários</div><p className="mt-2 text-2xl font-black text-slate-900">{users.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Ativos</div><p className="mt-2 text-2xl font-black text-emerald-600">{users.filter((user) => user.status === 'active').length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Troca pendente</div><p className="mt-2 text-2xl font-black text-amber-600">{users.filter((user) => user.must_change_password).length}</p></div>
      </div>
      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" />{message}</div>}
      {error && <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"><span>{error}</span><button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ShieldCheck className="h-4 w-4 text-orange-600" />Usuários da organização</h3><p className="mt-1 text-xs text-slate-500">Somente usuários comuns do seu tenant.</p></div>
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-orange-600"><UserPlus className="h-4 w-4" />Novo usuário</button>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2">
          <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome ou e-mail" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-400" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none"><option value="all">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select>
        </div>
        {loading ? <div className="flex justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando usuários...</div> : filteredUsers.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Nenhum usuário encontrado.</div> : (
          <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Telas</th><th className="px-4 py-3">Credencial</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => <tr key={user.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-bold text-slate-800">{user.name}</p><p className="text-[11px] text-slate-500">{user.email}</p></td><td className="px-4 py-3 font-semibold text-slate-600">{user.allowed_screen_ids.length} de {screens.length}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${user.must_change_password ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{user.must_change_password ? 'Troca obrigatória' : 'Definitiva'}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>{user.status === 'active' ? 'Ativo' : 'Inativo'}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-1">
              <button type="button" onClick={() => { setPermissionUser(user); setPermissionDraft(user.permissions ?? user.allowed_screen_ids.map((screenId) => ({ screenId, access: 'read' }))); }} className="rounded-md p-2 text-blue-600 hover:bg-blue-50" title="Permissões"><SlidersHorizontal className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setEditing(user); setEditName(user.name); }} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title="Editar"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => { setResetting(user); setResetPassword(emptyPassword); }} className="rounded-md p-2 text-amber-600 hover:bg-amber-50" title="Redefinir senha"><KeyRound className="h-4 w-4" /></button>
              <button type="button" onClick={() => requestStatus(user)} className={`rounded-md p-2 ${user.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={user.status === 'active' ? 'Desativar' : 'Ativar'}><Power className="h-4 w-4" /></button>
              <button type="button" onClick={() => requestDelete(user)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50" title="Excluir definitivamente"><Trash2 className="h-4 w-4" /></button>
            </div></td></tr>)}
          </tbody></table></div>
        )}
      </div>

      {createOpen && <Modal wide title="Criar usuário comum" description="O usuário será criado somente no seu tenant e deverá trocar a senha no primeiro login." onClose={() => { setCreateOpen(false); setCreatePassword(emptyPassword); setCreatePermissions([]); }}><form onSubmit={submitCreate} className="space-y-4 p-5"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Nome<input required minLength={2} value={createName} onChange={(event) => setCreateName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600">E-mail<input required type="email" value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label></div><PasswordControl value={createPassword} onChange={setCreatePassword} /><div><h4 className="mb-2 text-xs font-extrabold text-slate-700">Permissões iniciais</h4><PermissionMatrix screens={screens} value={createPermissions} onChange={setCreatePermissions} /></div><div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={saving} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Criar usuário</button></div></form></Modal>}
      {editing && <Modal title="Editar usuário" description={editing.email} onClose={() => setEditing(null)}><form onSubmit={submitEdit} className="space-y-4 p-5"><label className="block text-xs font-bold text-slate-600">Nome<input required minLength={2} value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><div className="rounded-lg border bg-slate-50 p-3 text-xs text-slate-500">O tenant e o perfil de usuário comum não podem ser alterados.</div><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Salvar</button></div></form></Modal>}
      {permissionUser && <Modal wide title="Permissões por tela" description={`${permissionUser.name} · somente telas publicadas neste tenant`} onClose={() => { setPermissionUser(null); setPermissionDraft([]); }}><form onSubmit={submitPermissions} className="space-y-4 p-5"><PermissionMatrix screens={screens} value={permissionDraft} onChange={setPermissionDraft} /><div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">Salvar revoga a sessão anterior para aplicar as novas permissões no próximo login.</div><div className="flex justify-end gap-2"><button type="button" onClick={() => setPermissionUser(null)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white">Salvar permissões</button></div></form></Modal>}
      {resetting && <Modal title="Redefinir senha" description={resetting.name} onClose={() => { setResetting(null); setResetPassword(emptyPassword); }}><form onSubmit={submitReset} className="space-y-4 p-5"><PasswordControl value={resetPassword} onChange={setResetPassword} /><div className="flex justify-end gap-2"><button type="button" onClick={() => setResetting(null)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancelar</button><button className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white">Continuar</button></div></form></Modal>}
      {pendingAction && <Modal title={pendingAction.title} description={pendingAction.description} onClose={() => setPendingAction(null)}><div className="p-5"><div className="mb-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />Confirme a ação para este usuário da sua organização.</div><div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPendingAction(null)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancelar</button><button type="button" disabled={saving} onClick={confirmAction} className={`rounded-lg px-4 py-2 text-xs font-bold text-white ${pendingAction.destructive ? 'bg-rose-600' : 'bg-emerald-600'}`}>{pendingAction.confirmLabel}</button></div></div></Modal>}
      {credential && <Modal title="Senha temporária — exibição única" description={credential.title} onClose={() => { setCredential(null); setCopied(false); }}><div className="space-y-4 p-5"><div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">Copie agora. Após fechar, a senha não poderá ser exibida novamente.</div><div className="flex items-center gap-2 rounded-lg bg-slate-950 p-3 font-mono text-sm text-white"><span className="min-w-0 flex-1 break-all">{credential.password}</span><button type="button" onClick={async () => { await navigator.clipboard.writeText(credential.password); setCopied(true); }} className="flex items-center gap-1 rounded bg-white/10 px-2 py-1.5 text-xs font-bold">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiada' : 'Copiar'}</button></div><p className="text-xs text-slate-500">Validade: {new Date(credential.expiresAt).toLocaleString('pt-BR')}.</p><button type="button" onClick={() => { setCredential(null); setCopied(false); }} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Já copiei, fechar definitivamente</button></div></Modal>}
      <button type="button" onClick={() => { setLoading(true); loadData().catch((requestError) => setError(errorMessage(requestError, 'Falha ao atualizar.'))).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800"><RefreshCw className="h-3.5 w-3.5" />Atualizar dados</button>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  X,
} from 'lucide-react';
import { ApiClientError } from '../../../services/apiClient';
import { configApi } from '../../../services/configApi';
import type {
  Client,
  ManagedUser,
  PasswordMode,
  TemporaryPasswordRequest,
} from '../../../types';
import { TenantUserManagementPanel } from './TenantUserManagementPanel';

type StatusFilter = 'all' | 'active' | 'inactive';

interface PasswordDraft {
  mode: PasswordMode;
  password: string;
}

interface OneTimeCredential {
  title: string;
  password: string;
  expiresAt: string;
}

interface PendingAction {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
}

const emptyPassword: PasswordDraft = { mode: 'generated', password: '' };

const passwordChecks = (password: string) => [
  { label: '10 ou mais caracteres', valid: password.length >= 10 },
  { label: 'Letra maiúscula', valid: /[A-Z]/.test(password) },
  { label: 'Letra minúscula', valid: /[a-z]/.test(password) },
  { label: 'Número', valid: /\d/.test(password) },
  { label: 'Caractere especial', valid: [...password].some((character) => '!@#$%^&*()-_=+[]{}:,.?'.includes(character)) },
];

const passwordPayload = (draft: PasswordDraft): TemporaryPasswordRequest => (
  draft.mode === 'generated'
    ? { mode: 'generated' }
    : { mode: 'defined', password: draft.password }
);

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiClientError && error.payload && typeof error.payload === 'object') {
    const payload = error.payload as { message?: string; detail?: string };
    return payload.message ?? payload.detail ?? fallback;
  }
  return fallback;
};

function Modal({ title, description, children, onClose }: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
            {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordControl({ value, onChange }: {
  value: PasswordDraft;
  onChange: (value: PasswordDraft) => void;
}) {
  const [visible, setVisible] = useState(false);
  const checks = passwordChecks(value.password);
  const score = checks.filter((item) => item.valid).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onChange({ mode: 'generated', password: '' })}
          className={`rounded-md px-3 py-2 text-xs font-bold ${value.mode === 'generated' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
        >
          Gerar automaticamente
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: 'defined', password: '' })}
          className={`rounded-md px-3 py-2 text-xs font-bold ${value.mode === 'defined' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500'}`}
        >
          Definir temporária
        </button>
      </div>

      {value.mode === 'generated' ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          O backend gerará uma senha forte. Ela será exibida somente uma vez após a confirmação.
        </div>
      ) : (
        <>
          <label className="block text-xs font-bold text-slate-600">
            Senha temporária
            <div className="relative mt-1.5">
              <input
                required
                type={visible ? 'text' : 'password'}
                value={value.password}
                onChange={(event) => onChange({ ...value, password: event.target.value })}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 pr-10 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
              <button type="button" onClick={() => setVisible((current) => !current)} className="absolute right-2.5 top-2.5 text-slate-400" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <div>
            <div className="mb-2 flex gap-1">
              {checks.map((item, index) => <span key={item.label} className={`h-1.5 flex-1 rounded-full ${index < score ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500">
              {checks.map((item) => (
                <span key={item.label} className={`flex items-center gap-1 ${item.valid ? 'text-emerald-700' : ''}`}>
                  <Check className="h-3 w-3" /> {item.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TeamUserManagementPanel() {
  const [masters, setMasters] = useState<ManagedUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createTenant, setCreateTenant] = useState('');
  const [createPassword, setCreatePassword] = useState<PasswordDraft>(emptyPassword);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState<PasswordDraft>(emptyPassword);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [oneTimeCredential, setOneTimeCredential] = useState<OneTimeCredential | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    const [masterList, clientList] = await Promise.all([
      configApi.listTenantMasters(),
      configApi.listClients(),
    ]);
    setMasters(masterList.filter((user) => !user.is_staff && user.roles.includes('admin')));
    setClients(clientList);
    setCreateTenant((current) => current || clientList.find((client) => client.status === 'active')?.slug || '');
  };

  useEffect(() => {
    let active = true;
    Promise.all([configApi.listTenantMasters(), configApi.listClients()])
      .then(([masterList, clientList]) => {
        if (!active) return;
        setMasters(masterList.filter((user) => !user.is_staff && user.roles.includes('admin')));
        setClients(clientList);
        setCreateTenant(clientList.find((client) => client.status === 'active')?.slug || '');
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError, 'Não foi possível carregar os MASTERs.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.slug, client.name])),
    [clients],
  );

  const filteredMasters = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return masters.filter((master) => {
      const matchesTenant = tenantFilter === 'all' || master.client_slug === tenantFilter;
      const matchesStatus = statusFilter === 'all' || master.status === statusFilter;
      const matchesSearch = !term || [master.name, master.email, master.client_slug ?? '', clientNames.get(master.client_slug ?? '') ?? '']
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(term));
      return matchesTenant && matchesStatus && matchesSearch;
    });
  }, [clientNames, masters, search, statusFilter, tenantFilter]);

  const runAndRefresh = async (action: () => Promise<void>, fallback: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await loadData();
    } catch (requestError) {
      setError(errorMessage(requestError, fallback));
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (createPassword.mode === 'defined' && !passwordChecks(createPassword.password).every((item) => item.valid)) {
      setError('A senha temporária ainda não atende à política.');
      return;
    }
    try {
      await runAndRefresh(async () => {
        const response = await configApi.createTenantMaster({
          name: createName.trim(),
          email: createEmail.trim(),
          clientSlug: createTenant,
          temporaryPassword: passwordPayload(createPassword),
        });
        setOneTimeCredential({
          title: `Credencial de ${response.user.name}`,
          password: response.temporaryPassword,
          expiresAt: response.expiresAt,
        });
        setCreateOpen(false);
        setCreateName('');
        setCreateEmail('');
        setCreatePassword(emptyPassword);
        setMessage('MASTER criado com sucesso.');
      }, 'Não foi possível criar o MASTER.');
    } catch {
      // A mensagem já foi normalizada por runAndRefresh.
    }
  };

  const submitEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await runAndRefresh(async () => {
        await configApi.updateTenantMaster(editing.id, { name: editName.trim() });
        setEditing(null);
        setMessage('Dados do MASTER atualizados.');
      }, 'Não foi possível atualizar o MASTER.');
    } catch {
      // A mensagem já foi normalizada por runAndRefresh.
    }
  };

  const requestStatusChange = (master: ManagedUser) => {
    const activating = master.status === 'inactive';
    setPendingAction({
      title: activating ? 'Ativar MASTER?' : 'Desativar MASTER?',
      description: activating
        ? `${master.name} poderá voltar a autenticar no tenant ${master.client_slug}.`
        : `${master.name} perderá acesso imediatamente e todas as sessões serão revogadas.`,
      confirmLabel: activating ? 'Ativar MASTER' : 'Desativar MASTER',
      destructive: !activating,
      run: async () => {
        await configApi.updateTenantMaster(master.id, { status: activating ? 'active' : 'inactive' });
        setMessage(activating ? 'MASTER ativado.' : 'MASTER desativado.');
      },
    });
  };

  const requestDelete = (master: ManagedUser) => {
    setPendingAction({
      title: 'Excluir MASTER?',
      description: `${master.name} perderá o acesso definitivamente. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir MASTER',
      destructive: true,
      run: async () => {
        await configApi.deleteTenantMaster(master.id);
        setMessage('MASTER excluído definitivamente.');
      },
    });
  };

  const submitReset = (event: FormEvent) => {
    event.preventDefault();
    if (!resetting) return;
    if (resetPassword.mode === 'defined' && !passwordChecks(resetPassword.password).every((item) => item.valid)) {
      setError('A senha temporária ainda não atende à política.');
      return;
    }
    const target = resetting;
    const credential = { ...resetPassword };
    setPendingAction({
      title: 'Redefinir senha do MASTER?',
      description: `As sessões atuais de ${target.name} serão revogadas e a nova senha será temporária.`,
      confirmLabel: 'Redefinir senha',
      destructive: true,
      run: async () => {
        const response = await configApi.resetTenantMasterPassword(target.id, passwordPayload(credential));
        setResetting(null);
        setResetPassword(emptyPassword);
        setOneTimeCredential({
          title: `Nova credencial de ${target.name}`,
          password: response.temporaryPassword,
          expiresAt: response.expiresAt,
        });
        setMessage('Senha temporária redefinida.');
      },
    });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const action = pendingAction;
    try {
      await runAndRefresh(action.run, 'Não foi possível concluir a ação.');
      setPendingAction(null);
    } catch {
      // Mantém a confirmação aberta para permitir nova tentativa.
    }
  };

  const copyCredential = async () => {
    if (!oneTimeCredential) return;
    await navigator.clipboard.writeText(oneTimeCredential.password);
    setCopied(true);
  };

  const closeOneTimeCredential = () => {
    setOneTimeCredential(null);
    setCopied(false);
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreatePassword(emptyPassword);
  };

  const closeResetModal = () => {
    setResetting(null);
    setResetPassword(emptyPassword);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><Users className="h-4 w-4" /> MASTERs</div>
          <p className="mt-2 text-2xl font-black text-slate-900">{masters.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Ativos</div>
          <p className="mt-2 text-2xl font-black text-emerald-600">{masters.filter((master) => master.status === 'active').length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Troca pendente</div>
          <p className="mt-2 text-2xl font-black text-amber-600">{masters.filter((master) => master.must_change_password).length}</p>
        </div>
      </div>

      {message && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" />{message}</div>}
      {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"><span>{error}</span><button type="button" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ShieldCheck className="h-4 w-4 text-orange-600" /> MASTERs dos clientes</h3>
            <p className="mt-1 text-xs text-slate-500">Somente responsáveis administrativos de tenants. Usuários comuns não aparecem aqui.</p>
          </div>
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-orange-600">
            <UserPlus className="h-4 w-4" /> Novo MASTER
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, e-mail ou tenant" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-400" />
          </label>
          <select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-400">
            <option value="all">Todos os tenants</option>
            {clients.map((client) => <option key={client.slug} value={client.slug}>{client.name} ({client.slug})</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-400">
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando MASTERs...</div>
        ) : filteredMasters.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Nenhum MASTER encontrado para os filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr><th className="px-4 py-3">MASTER</th><th className="px-4 py-3">Tenant</th><th className="px-4 py-3">Credencial</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMasters.map((master) => (
                  <tr key={master.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><p className="font-bold text-slate-800">{master.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{master.email}</p></td>
                    <td className="px-4 py-3"><p className="font-semibold text-slate-700">{clientNames.get(master.client_slug ?? '') ?? master.client_slug}</p><p className="text-[10px] font-mono text-slate-400">{master.client_slug}</p></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${master.must_change_password ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{master.must_change_password ? 'Troca obrigatória' : 'Definitiva'}</span></td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${master.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>{master.status === 'active' ? 'Ativo' : 'Inativo'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => { setEditing(master); setEditName(master.name); }} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Editar nome"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => { setResetting(master); setResetPassword(emptyPassword); }} className="rounded-md p-2 text-amber-600 hover:bg-amber-50" title="Redefinir senha"><KeyRound className="h-4 w-4" /></button>
                        <button type="button" onClick={() => requestStatusChange(master)} className={`rounded-md p-2 ${master.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`} title={master.status === 'active' ? 'Desativar' : 'Ativar'}><Power className="h-4 w-4" /></button>
                        <button type="button" onClick={() => requestDelete(master)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50" title="Excluir definitivamente"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">Exibindo {filteredMasters.length} de {masters.length} MASTERs.</div>
      </div>

      {createOpen && (
        <Modal title="Criar MASTER de cliente" description="A EQUIPE cria exclusivamente o responsável administrativo de um tenant." onClose={closeCreateModal}>
          <form onSubmit={submitCreate} className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Nome<input required minLength={2} value={createName} onChange={(event) => setCreateName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" /></label>
              <label className="text-xs font-bold text-slate-600">E-mail<input required type="email" value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" /></label>
            </div>
            <label className="block text-xs font-bold text-slate-600">Tenant<select required value={createTenant} onChange={(event) => setCreateTenant(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400">{clients.filter((client) => client.status === 'active').map((client) => <option key={client.slug} value={client.slug}>{client.name} ({client.slug})</option>)}</select></label>
            <PasswordControl value={createPassword} onChange={setCreatePassword} />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={closeCreateModal} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Criar MASTER</button></div>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Editar MASTER" description={`${editing.email} · ${editing.client_slug}`} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className="space-y-4 p-5">
            <label className="block text-xs font-bold text-slate-600">Nome<input required minLength={2} value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" /></label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">O tenant e o perfil MASTER não podem ser alterados por esta interface.</div>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Salvar alterações</button></div>
          </form>
        </Modal>
      )}

      {resetting && (
        <Modal title="Redefinir senha" description={`MASTER ${resetting.name} · ${resetting.client_slug}`} onClose={closeResetModal}>
          <form onSubmit={submitReset} className="space-y-4 p-5">
            <PasswordControl value={resetPassword} onChange={setResetPassword} />
            <div className="flex justify-end gap-2"><button type="button" onClick={closeResetModal} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600">Continuar</button></div>
          </form>
        </Modal>
      )}

      {pendingAction && (
        <Modal title={pendingAction.title} description={pendingAction.description} onClose={() => setPendingAction(null)}>
          <div className="p-5">
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Confirme somente se reconhece o MASTER e o tenant afetados.</div>
            <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPendingAction(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancelar</button><button type="button" disabled={saving} onClick={confirmAction} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50 ${pendingAction.destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{pendingAction.confirmLabel}</button></div>
          </div>
        </Modal>
      )}

      {oneTimeCredential && (
        <Modal title="Senha temporária — exibição única" description={oneTimeCredential.title} onClose={closeOneTimeCredential}>
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-800">Copie agora. Depois que esta janela for fechada, a senha não poderá ser exibida novamente.</div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-sm text-white"><span className="min-w-0 flex-1 break-all">{oneTimeCredential.password}</span><button type="button" onClick={copyCredential} className="inline-flex shrink-0 items-center gap-1 rounded bg-white/10 px-2 py-1.5 text-xs font-bold hover:bg-white/20">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copiada' : 'Copiar'}</button></div>
            <p className="text-xs text-slate-500">Validade: {new Date(oneTimeCredential.expiresAt).toLocaleString('pt-BR')}.</p>
            <button type="button" onClick={closeOneTimeCredential} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Já copiei, fechar definitivamente</button>
          </div>
        </Modal>
      )}

      <button type="button" onClick={() => { setLoading(true); loadData().catch((requestError) => setError(errorMessage(requestError, 'Falha ao atualizar.'))).finally(() => setLoading(false)); }} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800"><RefreshCw className="h-3.5 w-3.5" /> Atualizar dados reais</button>
    </div>
  );
}

export function UserManagementPanel({ mode = 'team' }: { mode?: 'team' | 'tenant' }) {
  return mode === 'tenant' ? <TenantUserManagementPanel /> : <TeamUserManagementPanel />;
}

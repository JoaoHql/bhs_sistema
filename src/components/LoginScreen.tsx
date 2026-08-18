import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { configApi } from '../services/configApi';
import { storeSession } from '../services/authToken';
import { useDashboard } from '../store/dashboardStore';

export function LoginScreen() {
  const { setCurrentUser } = useDashboard();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await configApi.login(email, password);
      storeSession(response.access_token);
      if (response.password_change_required) {
        setCurrentUser(response.user);
        return;
      }
      setSuccess(true);
      
      // Delay de 1 segundo para mostrar animação de sucesso
      setTimeout(() => {
        setCurrentUser(response.user);
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      const payload = typeof err === 'object' && err !== null && 'payload' in err
        ? (err as { payload?: { detail?: string; message?: string } }).payload
        : undefined;
      setError(payload?.detail || payload?.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-600/20 to-purple-600/0 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-600/10 to-blue-600/0 blur-[120px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Glassmorphic Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4 text-blue-400">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">BHS Sistemas</h1>
            <p className="text-slate-400 text-sm mt-2">
              Gestão de Visões e Governança do Sistema
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <span>Autenticado com sucesso! Carregando seu painel...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                E-mail institucional
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@bhs.com.br"
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  disabled={isLoading || success}
                  required
                />
              </div>
            </div>


            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Senha de acesso
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  disabled={isLoading || success}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/60 text-center">
            <span className="text-xs text-slate-500">
              Uso interno exclusivo para a equipe e clientes autorizados.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

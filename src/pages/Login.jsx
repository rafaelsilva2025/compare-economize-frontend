import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "@/api/apiClient";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, LogIn, Mail, Lock, User as UserIcon } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = (searchParams.get("mode") || "login").toLowerCase(); // login | signup
  const qpTokenRaw = searchParams.get("token") || "";
  const qpToken = qpTokenRaw ? decodeURIComponent(qpTokenRaw) : "";
  const qpType = (searchParams.get("type") || "").toLowerCase(); // user | business
  const isSignup = mode === "signup";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const accountType = useMemo(() => {
    const saved = (localStorage.getItem("signup_account_type") || "").toLowerCase();
    return qpType || saved || "user";
  }, [qpType]);

  // ✅ evita rodar duas vezes (React StrictMode pode chamar effects 2x em dev)
  const googleHandledRef = useRef(false);

  // ✅ NOVO: base URL do backend (Vercel/Prod)
  // Usa VITE_API_URL se existir; senão cai no domínio de produção correto
  const BACKEND_URL = useMemo(() => {
    const raw = (import.meta?.env?.VITE_API_URL || "").trim();
    const fallback = "https://api.compareeeeconomize.com.br";
    const base = raw || fallback;
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }, []);

  // ✅ NOVO: abre OAuth do Google com redirect de página (não pode usar fetch/axios)
  const handleGoogleLogin = () => {
    try {
      // Se quiser voltar pra uma página específica após login, definimos aqui
      // (você pode trocar para "/minha-economia" ou "/DashboardEmpresa" se preferir)
      const redirectTo = `${window.location.origin}/login?google=1`;

      const url =
        `${BACKEND_URL}/api/auth/google` +
        `?type=${encodeURIComponent(accountType)}` +
        `&redirectTo=${encodeURIComponent(redirectTo)}`;

      window.location.href = url;
    } catch (err) {
      console.error("GOOGLE_OAUTH_REDIRECT_ERROR:", err);
      toast.error("Não foi possível iniciar o login com Google.");
    }
  };

  // ✅ NOVO: debug do ambiente (ajuda MUITO no Vercel)
  useEffect(() => {
    try {
      // não quebra build, só loga quando abrir a página
      // eslint-disable-next-line no-console
      console.log("ENV VITE_API_URL:", import.meta.env.VITE_API_URL);
      // eslint-disable-next-line no-console
      console.log("BACKEND_URL (resolved):", BACKEND_URL);
    } catch (e) {
      // ignora
    }
  }, [BACKEND_URL]);

  // ✅ helper: normaliza tipo
  const normalizeType = (t) => String(t || "").toLowerCase().trim();

  // ✅ NOVO: regra ADMIN no frontend (sem remover nada)
  const ADMIN_EMAIL = "empresaslim@gmail.com";

  const applyAdminOverride = (userObj, emailCandidate) => {
    try {
      const e = String(emailCandidate || userObj?.email || "").toLowerCase().trim();
      if (e !== ADMIN_EMAIL) return userObj;

      const u = { ...(userObj || {}) };

      // ✅ força flags que o restante do front pode usar
      u.plan = "admin";
      u.role = "admin";

      // ✅ também ajuda compatibilidade com lugares que leem "type/account_type"
      // (não muda o que veio do backend, só garante fallback)
      if (!u.type && u.account_type) u.type = u.account_type;
      if (!u.account_type && u.type) u.account_type = u.type;

      return u;
    } catch {
      return userObj;
    }
  };

  const isAdminUser = (userObj, emailCandidate) => {
    const e = String(emailCandidate || userObj?.email || "").toLowerCase().trim();
    const plan = String(userObj?.plan || "").toLowerCase().trim();
    const role = String(userObj?.role || "").toLowerCase().trim();
    const type = String(userObj?.type || userObj?.account_type || "").toLowerCase().trim();

    return e === ADMIN_EMAIL || plan === "admin" || role === "admin" || type === "admin";
  };

  // ✅ 1) Se veio do Google com token na URL: salva e busca /me
  useEffect(() => {
    const run = async () => {
      if (!qpToken) return;
      if (googleHandledRef.current) return;
      googleHandledRef.current = true;

      const toastId = toast.loading("Finalizando login...");

      try {
        localStorage.setItem("token", qpToken);
        localStorage.setItem("signup_account_type", accountType);

        // ✅ endpoint certo (e chamada consistente)
        const meRaw = await apiRequest("/api/auth/me", { method: "GET" });

        // ✅ aplica admin override (se for o email admin)
        const me = applyAdminOverride(meRaw, meRaw?.email);

        localStorage.setItem("user", JSON.stringify(me));

        toast.success("Login Google realizado!", { id: toastId });

        // ✅ remove token da URL para não repetir login ao atualizar
        const type = normalizeType(me?.account_type || me?.type || accountType || "");

        // ✅ ADMIN sempre cai no dashboard empresarial (pra ver tudo)
        if (isAdminUser(me, me?.email)) {
          navigate("/DashboardEmpresa", { replace: true });
          return;
        }

        if (type === "business" || type === "empresa") {
          navigate("/DashboardEmpresa", { replace: true });
        } else {
          navigate("/minha-economia", { replace: true });
        }
      } catch (err) {
        console.error("GOOGLE_LOGIN_ERROR:", err);

        // ✅ NOVO: mostra mais info do erro
        toast.error(
          err?.message ? `Falha no Google login: ${err.message}` : "Não foi possível finalizar login com Google.",
          { id: toastId }
        );

        // ✅ fallback: limpa token ruim e volta pro login limpo
        localStorage.removeItem("token");
        navigate(`/login?type=${accountType}`, { replace: true });
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpToken, accountType, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || (isSignup && !fullName)) {
      toast.error(isSignup ? "Preencha nome, email e senha." : "Preencha email e senha.");
      return;
    }

    const toastId = toast.loading(isSignup ? "Criando conta..." : "Entrando...");

    try {
      setLoading(true);

      // ✅ 2) signup OU login
      const url = isSignup ? "/api/auth/register" : "/api/auth/login";

      const body = isSignup
        ? { full_name: fullName, email, password, account_type: accountType }
        : { email, password };

      const res = await apiRequest(url, { method: "POST", body });

      const token = res?.token;
      if (!token) {
        toast.error(isSignup ? "Não foi possível criar sua conta." : "Login inválido.", { id: toastId });
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("signup_account_type", accountType);

      // ✅ 3) Busca /me (fonte de verdade)
      const meRaw = await apiRequest("/api/auth/me", { method: "GET" });

      // ✅ aplica admin override (se for o email admin informado no login)
      const me = applyAdminOverride(meRaw, email);

      localStorage.setItem("user", JSON.stringify(me));

      toast.success(isSignup ? "Conta criada com sucesso!" : "Login realizado!", { id: toastId });

      // ✅ ADMIN sempre cai no dashboard empresarial (pra ver tudo)
      if (isAdminUser(me, email)) {
        navigate("/DashboardEmpresa", { replace: true });
        return;
      }

      const type = normalizeType(me?.account_type || me?.type || accountType || "");
      if (type === "business" || type === "empresa") {
        navigate("/DashboardEmpresa", { replace: true });
      } else {
        navigate("/minha-economia", { replace: true });
      }
    } catch (err) {
      console.error("AUTH_ERROR:", err);

      // ✅ NOVO: erro mais claro (útil pra CORS/401)
      toast.error(
        err?.message
          ? `Erro no login: ${err.message}`
          : (isSignup ? "Erro ao criar conta. Verifique os dados." : "Não foi possível entrar."),
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-semibold text-gray-900">{isSignup ? "Criar conta" : "Entrar"}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
              {isSignup ? (
                <UserIcon className="w-6 h-6 text-emerald-600" />
              ) : (
                <LogIn className="w-6 h-6 text-emerald-600" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              {isSignup ? "Crie sua conta" : "Acesse sua conta"}
            </h2>
            <p className="text-gray-500 mt-2">
              {accountType === "business"
                ? "Acesse seu painel empresarial e seus benefícios."
                : "Entre para ver seu painel e seus benefícios."}
            </p>

            {/* ✅ NOVO: Botão Google OAuth (redirect de página) */}
            {!isSignup && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full h-12 mt-6 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.651 32.657 29.194 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.969 3.031l5.657-5.657C34.033 6.053 29.194 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.969 3.031l5.657-5.657C34.033 6.053 29.194 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                  <path fill="#4CAF50" d="M24 44c5.094 0 9.862-1.947 13.409-5.091l-6.19-5.238C29.146 35.091 26.676 36 24 36c-5.173 0-9.564-3.322-11.167-7.946l-6.517 5.02C9.617 39.556 16.33 44 24 44z"/>
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.765 2.187-2.243 4.025-4.084 5.291h.003l6.19 5.238C36.971 39.23 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                </svg>
                Entrar com Google
              </button>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isSignup && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <div className="mt-2 relative">
                    <UserIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      type="text"
                      placeholder="Seu nome"
                      className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="mt-2 relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="seuemail@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Senha</label>
                <div className="mt-2 relative">
                  <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {loading ? (isSignup ? "Criando..." : "Entrando...") : (isSignup ? "Criar conta" : "Entrar")}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm">
              {!isSignup ? (
                <Link
                  to={createPageUrl("EscolherTipoConta")}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Criar conta
                </Link>
              ) : (
                <Link
                  to={`/login?type=${accountType}`}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Já tenho conta
                </Link>
              )}

              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Voltar ao início
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

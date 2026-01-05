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

  // ✅ NOVO: debug do ambiente (ajuda MUITO no Vercel)
  useEffect(() => {
    try {
      // não quebra build, só loga quando abrir a página
      // eslint-disable-next-line no-console
      console.log("ENV VITE_API_URL:", import.meta.env.VITE_API_URL);
    } catch (e) {
      // ignora
    }
  }, []);

  // ✅ helper: normaliza tipo
  const normalizeType = (t) => String(t || "").toLowerCase().trim();

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
        const me = await apiRequest("/api/auth/me", { method: "GET" });

        localStorage.setItem("user", JSON.stringify(me));

        toast.success("Login Google realizado!", { id: toastId });

        // ✅ remove token da URL para não repetir login ao atualizar
        const type = normalizeType(me?.account_type || me?.type || accountType || "");

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
      const me = await apiRequest("/api/auth/me", { method: "GET" });
      localStorage.setItem("user", JSON.stringify(me));

      toast.success(isSignup ? "Conta criada com sucesso!" : "Login realizado!", { id: toastId });

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

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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

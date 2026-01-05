import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Mail,
  Sparkles,
  User,
  LogIn,
} from "lucide-react";

export default function CriarConta() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ tipo da conta (travado após vir de /entrar)
  const [accountType, setAccountType] = useState("user"); // 'user' | 'business'

  // ✅ benefícios dinâmicos
  const benefits = useMemo(() => {
    if (accountType === "business") {
      return [
        "Perfil público do estabelecimento",
        "Atualize preços dos produtos",
        "Estatísticas de visualizações",
        "Destaque nas comparações",
      ];
    }
    return [
      "Salve suas listas de compras",
      "Receba alertas de preços",
      "Histórico de economias",
      "Sincronize em todos os dispositivos",
    ];
  }, [accountType]);

  // ✅ 1) se vier /CriarConta?type=user|business, aplica automaticamente (e trava)
  useEffect(() => {
    const qpType = (searchParams.get("type") || "").toLowerCase();
    if (qpType === "user" || qpType === "business") {
      setAccountType(qpType);
    } else {
      // ✅ 2) se não vier na URL, tenta recuperar o último escolhido
      const saved = localStorage.getItem("signup_account_type");
      if (saved === "user" || saved === "business") setAccountType(saved);
    }
  }, [searchParams]);

  // ✅ sempre que trocar, salva para o fluxo de cadastro/login usar depois
  useEffect(() => {
    localStorage.setItem("signup_account_type", accountType);
  }, [accountType]);

  // ✅ travado: não deixa trocar aqui (somente voltando)
  const handleSelectType = (type) => {
    setAccountType(type);
    const next = new URLSearchParams(searchParams);
    next.set("type", type);
    setSearchParams(next, { replace: true });
  };

  // ✅ VOLTAR: garante que Empresa volte para PlanosEmpresas
  const handleBack = () => {
    const from = searchParams.get("from"); // ex: /PlanosEmpresas
    if (from) {
      navigate(from);
      return;
    }

    // fallback inteligente
    if (accountType === "business") {
      navigate("/PlanosEmpresas");
      return;
    }

    navigate(-1);
  };

  // ✅ Login (já sou cliente)
  const handleAlreadyClient = () => {
    localStorage.setItem("signup_account_type", accountType);
    navigate(`/login?type=${accountType}`);
  };

  // ✅ cadastro via email
  const handleContinueWithEmail = () => {
    localStorage.setItem("signup_account_type", accountType);
    navigate(`/login?mode=signup&type=${accountType}`);
  };

  // ✅ Google OAuth (CORRIGIDO SEM MEXER NO VISUAL)
  const handleContinueWithGoogle = () => {
    localStorage.setItem("signup_account_type", accountType);

    const FRONTEND_URL = window.location.origin;
    const redirectTo = `${FRONTEND_URL}/login?google=1&type=${accountType}`;

    const BACKEND_URL =
      import.meta.env.VITE_API_URL || "http://localhost:8000";

    const url =
      `${BACKEND_URL}/api/auth/google` +
      `?type=${encodeURIComponent(accountType)}` +
      `&redirectTo=${encodeURIComponent(redirectTo)}`;

    // ⚠️ redirect direto (OAuth não usa fetch)
    window.location.assign(url);
  };

  const isBusiness = accountType === "business";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top bar */}
      <div className="max-w-lg mx-auto px-4 pt-6 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          aria-label="Voltar"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* ✅ Já sou cliente */}
        <button
          onClick={handleAlreadyClient}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          type="button"
        >
          <LogIn className="w-4 h-4" />
          Já sou cliente
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* ✅ Card ÚNICO (travado) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div
            className={`w-full py-5 px-6 rounded-2xl transition-all shadow-md ${
              isBusiness ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                {isBusiness ? (
                  <Briefcase className="w-6 h-6 text-white" />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-semibold text-base">
                  {isBusiness ? "Empresa" : "Usuário"}
                </p>
                <p className="text-sm opacity-90">
                  {isBusiness
                    ? "Cadastrar estabelecimento"
                    : "Economizar nas compras"}
                </p>
              </div>

              <button
                onClick={() => handleSelectType(isBusiness ? "business" : "user")}
                className="hidden"
                aria-hidden="true"
                type="button"
              />
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-3">
            Para trocar o tipo de conta, volte para a tela anterior.
          </p>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg ${
              isBusiness
                ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200"
                : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200"
            }`}
          >
            {isBusiness ? (
              <Briefcase className="w-8 h-8 text-white" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isBusiness
              ? "Cadastre seu estabelecimento"
              : "Crie sua conta gratuita"}
          </h1>

          <p className="text-gray-500">
            {isBusiness
              ? "Aumente sua visibilidade e atraia mais clientes"
              : "Salve suas listas e receba alertas de preços"}
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-50 to-yellow-50/30 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-900">
              Benefícios exclusivos
            </span>
          </div>

          <ul className="space-y-3">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                {benefit}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Login Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Button
            onClick={handleContinueWithGoogle}
            className="w-full py-6 text-base rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            type="button"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

          <Button
            onClick={handleContinueWithEmail}
            className="w-full py-6 text-base rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
            type="button"
          >
            <Mail className="w-5 h-5 mr-3" />
            Continuar com Email
          </Button>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Ao criar uma conta, você concorda com nossos{" "}
              <button
                type="button"
                onClick={() => navigate("/ComoFunciona")}
                className="text-emerald-600 hover:underline"
              >
                Termos de Uso
              </button>{" "}
              e{" "}
              <button
                type="button"
                onClick={() => navigate("/PoliticaPrivacidade")}
                className="text-emerald-600 hover:underline"
              >
                Política de Privacidade
              </button>
            </p>
          </div>
        </motion.div>

        {/* Continue without account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 pt-8 border-t border-gray-100"
        >
          <Link to={createPageUrl("MinhaLista")}>
            <Button
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
              type="button"
            >
              Continuar sem conta
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Building2, ArrowRight } from "lucide-react";

export default function EscolherTipoConta() {
  const navigate = useNavigate();

  // ✅ ADICIONADO: volta para a página anterior (e fallback para PlanosEmpresas)
  const handleBack = () => {
    // se tiver histórico, volta
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // fallback: se abrir direto essa página, manda para planos empresas
      navigate("/PlanosEmpresas");
    }
  };

  const go = (type) => {
    localStorage.setItem("signup_account_type", type);
    navigate(`/CriarConta?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ✅ ADICIONADO: botão voltar */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Voltar"
          >
            {/* usa o ArrowRight rotacionado pra virar "voltar" (não mexe nos imports) */}
            <ArrowRight className="w-5 h-5 text-gray-600 rotate-180" />
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Entrar / Criar conta</h1>
          <p className="text-gray-500 mt-2">
            Escolha como você quer usar o CompareEconomize
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Usuário */}
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => go("user")}
            className="text-left bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
              <User className="w-6 h-6 text-emerald-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-900">Sou Usuário</h2>
            <p className="text-gray-500 mt-2">
              Compare preços, crie listas e acompanhe sua economia.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-emerald-700 font-semibold">
              Continuar <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>

          {/* Empresa */}
          <motion.button
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10 }}
            onClick={() => go("business")}
            className="text-left bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-900">Sou Empresa</h2>
            <p className="text-gray-500 mt-2">
              Tenha dashboard, destaque e mantenha seus preços atualizados.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-blue-700 font-semibold">
              Continuar <ArrowRight className="w-4 h-4" />
            </div>
          </motion.button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          Você pode trocar o tipo de conta depois.
        </p>
      </div>
    </div>
  );
}

import { Building2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CriarContaEmpresa() {
  const navigate = useNavigate();

  const handleGoogle = () => {
    // ✅ salva tipo para o fluxo
    localStorage.setItem("signup_account_type", "business");

    // ✅ redireciona pro backend iniciar o Google OAuth
    const FRONTEND_URL = window.location.origin; // ex: http://localhost:5173
    const redirectTo = `${FRONTEND_URL}/login?google=1&type=business`;

    const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

    const url =
      `${BACKEND_URL}/api/auth/google` +
      `?type=business` +
      `&redirectTo=${encodeURIComponent(redirectTo)}`;

    window.location.href = url;
  };

  const handleEmail = () => {
    // ✅ salva tipo para o fluxo
    localStorage.setItem("signup_account_type", "business");

    // ✅ reaproveita a tela de Login para signup
    navigate("/login?mode=signup&type=business");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-gray-200 text-center">
        
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-emerald-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Criar conta empresarial
        </h1>

        <p className="text-gray-600 mb-6">
          Cadastre seu estabelecimento para divulgar preços e atrair mais clientes
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            Continuar com Google
          </button>

          <button
            type="button"
            onClick={handleEmail}
            className="w-full h-12 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
          >
            Continuar com Email
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Já tem conta?{" "}
          <Link to={createPageUrl("Login")} className="text-emerald-600 font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

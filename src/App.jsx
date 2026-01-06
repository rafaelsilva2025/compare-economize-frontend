import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Layout from "./pages/Layout.jsx";

// ✅ suas páginas
import Home from "./pages/Home";
import Login from "./pages/Login";
import MinhaEconomia from "./pages/MinhaEconomia";
import { PrivateRoute } from "./routes/PrivateRoute";

import BuscaInteligente from "./pages/BuscaInteligente";
import ComoFunciona from "./pages/ComoFunciona";
import Comparacao from "./pages/Comparacao";
import CriarConta from "./pages/CriarConta";
import DashboardEmpresa from "./pages/DashboardEmpresa";
import HoteisComparacao from "./pages/HoteisComparacao";
import MarketDetail from "./pages/MarketDetail";
import Mercados from "./pages/Mercados";
import MinhaLista from "./pages/MinhaLista";
import Pagamento from "./pages/Pagamento";
import PagamentoErro from "./pages/PagamentoErro";
import PagamentoSucesso from "./pages/PagamentoSucesso";
import Planos from "./pages/Planos";
import PlanosEmpresas from "./pages/PlanosEmpresas";
import PlanosUsuarios from "./pages/PlanosUsuarios";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import ProductDetail from "./pages/ProductDetail";
import Sobre from "./pages/Sobre";
import CadastroBase from "./pages/CadastroBase";
import EscolherTipoConta from "./pages/EscolherTipoConta";
import Relatorios from "./pages/Relatorios";
import CriarContaEmpresa from "./pages/CriarContaEmpresa";
import { PlanRoute } from "./routes/PlanRoute"; // ✅ MANTIDO

const queryClient = new QueryClient();

/**
 * Descobre qual "nome de página" estamos para o Layout saber
 * quando esconder Header/Footer (mantém o comportamento do Base44).
 */
function useCurrentPageName() {
  const { pathname } = useLocation();

  // ex: "/" -> "Home"
  if (pathname === "/" || pathname === "/Home") return "Home";

  // remove "/" e pega só o primeiro pedaço
  const clean = pathname.replace(/^\//, "");
  // para rotas tipo "/minha-economia" virar "MinhaEconomia"
  if (clean.toLowerCase() === "minha-economia") return "MinhaEconomia";

  // rotas padrão do seu projeto são "CamelCase" (ex: /CadastroBase)
  // então usamos o nome do path como pageName
  return clean;
}

/**
 * Wrapper que aplica Layout em todas as páginas (Header/Footer).
 */
function AppRoutesWithLayout() {
  const currentPageName = useCurrentPageName();

  return (
    <Layout currentPageName={currentPageName}>
      <Routes>
        {/* Home padrão */}
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />

        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />

        <Route path="/BuscaInteligente" element={<BuscaInteligente />} />
        <Route path="/ComoFunciona" element={<ComoFunciona />} />
        <Route path="/Comparacao" element={<Comparacao />} />
        <Route path="/CriarConta" element={<CriarConta />} />

        {/* ✅ ATUALIZADO: DashboardEmpresa agora exige login
            (e se você quiser travar por plano depois, é só colocar requirePlan={["pro","premium"]}) */}
        <Route
          path="/DashboardEmpresa"
          element={
            <PrivateRoute>
              <DashboardEmpresa />
            </PrivateRoute>
          }
        />

        <Route path="/HoteisComparacao" element={<HoteisComparacao />} />
        <Route path="/MarketDetail" element={<MarketDetail />} />
        <Route path="/Mercados" element={<Mercados />} />
        <Route path="/MinhaLista" element={<MinhaLista />} />
        <Route path="/Pagamento" element={<Pagamento />} />
        <Route path="/PagamentoErro" element={<PagamentoErro />} />
        <Route path="/PagamentoSucesso" element={<PagamentoSucesso />} />
        <Route path="/Planos" element={<Planos />} />
        <Route path="/PlanosEmpresas" element={<PlanosEmpresas />} />
        <Route path="/PlanosUsuarios" element={<PlanosUsuarios />} />
        <Route path="/PoliticaPrivacidade" element={<PoliticaPrivacidade />} />
        <Route path="/ProductDetail" element={<ProductDetail />} />
        <Route path="/Sobre" element={<Sobre />} />
        <Route path="/entrar" element={<EscolherTipoConta />} />
        <Route path="/empresa/criar-conta" element={<CriarContaEmpresa />} />

        {/* Cadastro base */}
        <Route path="/CadastroBase" element={<CadastroBase />} />

        {/* ✅ Rotas protegidas (login obrigatório) */}
        <Route
          path="/minha-economia"
          element={
            <PrivateRoute>
              <MinhaEconomia />
            </PrivateRoute>
          }
        />

        {/* ✅ PlanRoute - mantido
            ✅ ATUALIZADO: adiciona "admin" na lista allow
            (assim, quando o user.plan for "admin", ele passa aqui também) */}
        <Route
          path="/Relatorios"
          element={
            <PlanRoute allowFree={true} allow={["pro", "premium", "admin"]}>
              <Relatorios />
            </PlanRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* ✅ Isso garante que ao navegar (inclusive por links do Footer),
            a nova página comece do topo */}
        <ScrollToTop />

        <AppRoutesWithLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

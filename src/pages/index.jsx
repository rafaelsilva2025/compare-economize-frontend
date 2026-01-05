import Layout from "./Layout.jsx";

import BuscaInteligente from "./BuscaInteligente";

import ComoFunciona from "./ComoFunciona";

import Comparacao from "./Comparacao";

import CriarConta from "./CriarConta";

import DashboardEmpresa from "./DashboardEmpresa";

import Home from "./Home";

import HoteisComparacao from "./HoteisComparacao";

import MarketDetail from "./MarketDetail";

import Mercados from "./Mercados";

import MinhaEconomia from "./MinhaEconomia";

import MinhaLista from "./MinhaLista";

import Pagamento from "./Pagamento";

import PagamentoErro from "./PagamentoErro";

import PagamentoSucesso from "./PagamentoSucesso";

import Planos from "./Planos";

import PlanosEmpresas from "./PlanosEmpresas";

import PlanosUsuarios from "./PlanosUsuarios";

import PoliticaPrivacidade from "./PoliticaPrivacidade";

import ProductDetail from "./ProductDetail";

import Sobre from "./Sobre";

import CadastroBase from "./CadastroBase";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    BuscaInteligente: BuscaInteligente,
    
    ComoFunciona: ComoFunciona,
    
    Comparacao: Comparacao,
    
    CriarConta: CriarConta,
    
    DashboardEmpresa: DashboardEmpresa,
    
    Home: Home,
    
    HoteisComparacao: HoteisComparacao,
    
    MarketDetail: MarketDetail,
    
    Mercados: Mercados,
    
    MinhaEconomia: MinhaEconomia,
    
    MinhaLista: MinhaLista,
    
    Pagamento: Pagamento,
    
    PagamentoErro: PagamentoErro,
    
    PagamentoSucesso: PagamentoSucesso,
    
    Planos: Planos,
    
    PlanosEmpresas: PlanosEmpresas,
    
    PlanosUsuarios: PlanosUsuarios,
    
    PoliticaPrivacidade: PoliticaPrivacidade,
    
    ProductDetail: ProductDetail,
    
    Sobre: Sobre,

    CadastroBase: CadastroBase,

    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<BuscaInteligente />} />
                
                
                <Route path="/BuscaInteligente" element={<BuscaInteligente />} />
                
                <Route path="/ComoFunciona" element={<ComoFunciona />} />
                
                <Route path="/Comparacao" element={<Comparacao />} />
                
                <Route path="/CriarConta" element={<CriarConta />} />
                
                <Route path="/DashboardEmpresa" element={<DashboardEmpresa />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/HoteisComparacao" element={<HoteisComparacao />} />
                
                <Route path="/MarketDetail" element={<MarketDetail />} />
                
                <Route path="/Mercados" element={<Mercados />} />
                
                <Route path="/MinhaEconomia" element={<MinhaEconomia />} />
                
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

                <Route path="/CadastroBase" element={<CadastroBase />} />

                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
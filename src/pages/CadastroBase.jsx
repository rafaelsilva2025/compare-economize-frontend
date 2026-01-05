import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CadastroBase() {
  const qc = useQueryClient();

  const { data: products = [], isLoading: lp } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiRequest("/products"),
  });

  const { data: markets = [], isLoading: lm } = useQuery({
    queryKey: ["markets"],
    queryFn: () => apiRequest("/markets"),
  });

  const { data: prices = [], isLoading: lpr } = useQuery({
    queryKey: ["prices"],
    queryFn: () => apiRequest("/prices"),
  });

  const [prod, setProd] = useState({ id: "", name: "", unit: "" });
  const [market, setMarket] = useState({
    id: "",
    name: "",
    categorySlug: "mercado",
    latitude: "",
    longitude: "",
  });
  const [price, setPrice] = useState({ marketId: "", productId: "", price: "" });

  const priceView = useMemo(() => {
    const pMap = new Map(products.map((p) => [p.id, p]));
    const mMap = new Map(markets.map((m) => [m.id, m]));
    return prices.map((pr) => ({
      ...pr,
      productName: pMap.get(pr.productId)?.name || pr.productId,
      marketName: mMap.get(pr.marketId)?.name || pr.marketId,
    }));
  }, [prices, products, markets]);

  async function saveProduct() {
    if (!prod.name.trim()) return toast.error("Digite o nome do produto");
    const payload = {
      id: prod.id.trim() || uid("prod"),
      name: prod.name.trim(),
      unit: prod.unit.trim() || null,
    };
    await apiRequest("/products", { method: "POST", body: JSON.stringify(payload) });
    toast.success("Produto salvo ✅");
    setProd({ id: "", name: "", unit: "" });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function saveMarket() {
    if (!market.name.trim()) return toast.error("Digite o nome do mercado");
    const payload = {
      id: market.id.trim() || uid("market"),
      name: market.name.trim(),
      categorySlug: market.categorySlug || null,
      latitude: market.latitude ? parseFloat(market.latitude) : null,
      longitude: market.longitude ? parseFloat(market.longitude) : null,
    };
    await apiRequest("/markets", { method: "POST", body: JSON.stringify(payload) });
    toast.success("Mercado salvo ✅");
    setMarket({ id: "", name: "", categorySlug: "mercado", latitude: "", longitude: "" });
    qc.invalidateQueries({ queryKey: ["markets"] });
  }

  async function savePrice() {
    if (!price.marketId) return toast.error("Selecione um mercado");
    if (!price.productId) return toast.error("Selecione um produto");
    const v = parseFloat(price.price);
    if (!Number.isFinite(v) || v <= 0) return toast.error("Preço inválido");

    const payload = { marketId: price.marketId, productId: price.productId, price: v };
    await apiRequest("/prices", { method: "POST", body: JSON.stringify(payload) });
    toast.success("Preço salvo ✅");
    setPrice((s) => ({ ...s, price: "" }));
    qc.invalidateQueries({ queryKey: ["prices"] });
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold">Cadastro (Teste)</h1>
      <p className="text-sm text-gray-600">
        Use esta tela para cadastrar dados e testar os botões. Depois a gente protege com login e perfil empresa.
      </p>

      {/* Produto */}
      <section className="bg-white border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Cadastrar Produto</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="ID (opcional)" value={prod.id} onChange={(e) => setProd((s) => ({ ...s, id: e.target.value }))} />
          <Input placeholder="Nome do produto" value={prod.name} onChange={(e) => setProd((s) => ({ ...s, name: e.target.value }))} />
          <Input placeholder="Unidade (opcional) ex: kg, un, L" value={prod.unit} onChange={(e) => setProd((s) => ({ ...s, unit: e.target.value }))} />
        </div>
        <Button onClick={saveProduct}>Salvar Produto</Button>
        <div className="text-sm text-gray-600">{lp ? "Carregando..." : `Total produtos: ${products.length}`}</div>
      </section>

      {/* Mercado */}
      <section className="bg-white border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Cadastrar Mercado</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="ID (opcional)" value={market.id} onChange={(e) => setMarket((s) => ({ ...s, id: e.target.value }))} />
          <Input placeholder="Nome do mercado" value={market.name} onChange={(e) => setMarket((s) => ({ ...s, name: e.target.value }))} />
          <Input placeholder="Categoria (mercado/farmacia/combustivel)" value={market.categorySlug} onChange={(e) => setMarket((s) => ({ ...s, categorySlug: e.target.value }))} />
          <Input placeholder="Latitude (opcional)" value={market.latitude} onChange={(e) => setMarket((s) => ({ ...s, latitude: e.target.value }))} />
          <Input placeholder="Longitude (opcional)" value={market.longitude} onChange={(e) => setMarket((s) => ({ ...s, longitude: e.target.value }))} />
        </div>
        <Button onClick={saveMarket}>Salvar Mercado</Button>
        <div className="text-sm text-gray-600">{lm ? "Carregando..." : `Total mercados: ${markets.length}`}</div>
      </section>

      {/* Preço */}
      <section className="bg-white border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">Cadastrar Preço</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="h-10 rounded-md border px-3" value={price.marketId} onChange={(e) => setPrice((s) => ({ ...s, marketId: e.target.value }))}>
            <option value="">Selecione o mercado</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select className="h-10 rounded-md border px-3" value={price.productId} onChange={(e) => setPrice((s) => ({ ...s, productId: e.target.value }))}>
            <option value="">Selecione o produto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <Input placeholder="Preço (ex: 12.90)" value={price.price} onChange={(e) => setPrice((s) => ({ ...s, price: e.target.value }))} />
        </div>

        <Button onClick={savePrice}>Salvar Preço</Button>

        <div className="text-sm text-gray-600">{lpr ? "Carregando..." : `Total preços: ${prices.length}`}</div>

        <div className="mt-4 border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-sm font-medium">Últimos preços cadastrados</div>
          <div className="max-h-64 overflow-auto">
            {priceView.slice().reverse().slice(0, 30).map((pr) => (
              <div key={pr.id} className="px-3 py-2 text-sm border-t flex justify-between">
                <span>{pr.marketName} — {pr.productName}</span>
                <strong>R$ {Number(pr.price).toFixed(2)}</strong>
              </div>
            ))}
            {priceView.length === 0 && (
              <div className="px-3 py-3 text-sm text-gray-500">Nenhum preço ainda.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

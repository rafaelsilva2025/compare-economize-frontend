import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Wand2,
  History,
  Trash2,
  ShoppingCart,
  Pill,
  Fuel,
  Copy,
  Check,
} from "lucide-react";

const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

const STORAGE_KEY = "ai_search_history_v1";

const examplePrompts = [
  "5kg de arroz, 2kg de feijão e óleo",
  "Remédios para dor de cabeça",
  "Lista do mercado: leite, pão, café e açúcar",
  "Preciso abastecer meu carro com gasolina",
];

const quickCategories = [
  {
    key: "mercado",
    title: "Mercado",
    subtitle: "Lista de compras",
    icon: ShoppingCart,
    prompt: "Minha lista de compras: arroz, feijão, óleo, leite, pão",
  },
  {
    key: "farmacia",
    title: "Farmácia",
    subtitle: "Remédios e higiene",
    icon: Pill,
    prompt: "Preciso de remédios para gripe e dor de garganta",
  },
  {
    key: "combustivel",
    title: "Combustível",
    subtitle: "Abastecimento",
    icon: Fuel,
    prompt: "Quero abastecer: gasolina comum 40 litros",
  },
];

export default function BuscaInteligente() {
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // resultado (você pode adaptar ao formato real do seu backend)
  const [result, setResult] = useState(null);

  const [history, setHistory] = useState([]);

  // carregando histórico
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {
      setHistory([]);
    }
  }, []);

  const saveToHistory = (prompt) => {
    const entry = {
      id: crypto?.randomUUID?.() || String(Date.now()),
      prompt,
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Histórico apagado");
  };

  const applyExample = (prompt) => {
    setText(prompt);
    setResult(null);
    // rola para o topo do card
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const canSubmit = useMemo(() => text.trim().length >= 6, [text]);

  async function callAI(prompt) {
    // ajuste aqui se seu endpoint tiver outro nome
    const url = `${API_BASE}/api/ai/identify-products`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // você pode mandar mais dados se quiser
      body: JSON.stringify({ text: prompt }),
      credentials: "include",
    });

    if (!res.ok) {
      let msg = "Falha ao consultar a IA.";
      try {
        const data = await res.json();
        msg = data?.detail || data?.error || msg;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  }

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;

    setLoading(true);
    setResult(null);

    try {
      saveToHistory(text.trim());
      const data = await callAI(text.trim());

      // ✅ tolerante a formatos diferentes:
      // - data.items
      // - data.products
      // - data.result.items
      const items =
        data?.items ||
        data?.products ||
        data?.result?.items ||
        data?.result?.products ||
        [];

      const normalized = Array.isArray(items)
        ? items.map((x, idx) => ({
            id: x?.id || idx,
            name: x?.name || x?.product || x?.title || String(x),
            quantity: x?.quantity || x?.qty || null,
            unit: x?.unit || null,
            category: x?.category || x?.type || null,
          }))
        : [];

      setResult({
        raw: data,
        items: normalized,
      });

      toast.success("Itens identificados com sucesso!");
    } catch (err) {
      toast.error(err.message || "Erro ao consultar IA");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result?.items?.length) return;
    const lines = result.items.map((i) => {
      const q = i.quantity ? `${i.quantity}${i.unit ? i.unit : ""} ` : "";
      return `- ${q}${i.name}`;
    });
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Resultado copiado!");
  };

  const useResult = () => {
    // aqui você pode enviar pro MinhaLista via state, localStorage ou backend
    // por enquanto, só salva no localStorage como exemplo:
    if (!result?.items?.length) return;

    localStorage.setItem("ai_last_result", JSON.stringify(result.items));
    toast.success("Salvei o resultado (ai_last_result). Agora ligamos na MinhaLista.");
    navigate("/MinhaLista");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f6ff] via-white to-white">
      {/* Top */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900">Busca Inteligente</h1>
            <p className="text-sm text-purple-600 -mt-0.5">Powered by IA</p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  O que você precisa?
                </h2>
                <p className="text-gray-500 mt-1">
                  Digite naturalmente. A IA entende e transforma em itens para comparar preços.
                </p>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                <Wand2 className="w-4 h-4" />
                <span>Mais rápido • Mais fácil</span>
              </div>
            </div>

            <div className="mt-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Ex: 2kg de arroz, feijão, óleo e café\nou: preciso de remédios para gripe`}
                className="w-full min-h-[130px] rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-300 p-4 text-gray-800"
              />
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="flex gap-2 flex-wrap">
                {examplePrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => applyExample(p)}
                    className="px-3 py-1.5 rounded-full text-sm bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="h-12 rounded-xl px-6 bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Processando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Buscar melhor preço
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* barra inferior (dicas rápidas) */}
          <div className="bg-gradient-to-r from-purple-50 to-white border-t border-gray-100 px-6 md:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickCategories.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    onClick={() => applyExample(c.prompt)}
                    className="text-left rounded-xl bg-white border border-gray-200 hover:border-purple-200 hover:shadow-sm transition p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-purple-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.title}</p>
                        <p className="text-sm text-gray-500">{c.subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Histórico */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-700" />
              <h3 className="font-bold text-gray-900">Histórico de buscas</h3>
            </div>
            <button
              onClick={clearHistory}
              className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-gray-500 mt-3 text-sm">
              Nenhuma busca ainda. Clique em um exemplo acima para começar.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => applyExample(h.prompt)}
                  className="text-left rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/40 transition p-3"
                >
                  <p className="text-gray-900 font-medium">{h.prompt}</p>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Resultado */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Resultado identificado
                </h3>
                <p className="text-sm text-gray-500">
                  Confira os itens. Você pode copiar ou usar esse resultado.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={copyResult}
                  className="rounded-xl"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar
                </Button>
                <Button
                  onClick={useResult}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Usar resultado
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {result.items.length === 0 ? (
                <p className="text-gray-500">
                  A IA não retornou itens. Me diga qual foi o texto e eu ajusto o parser.
                </p>
              ) : (
                result.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-200 p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity ? (
                          <>
                            Qtd: <span className="text-gray-800">{item.quantity}</span>{" "}
                            {item.unit ? <span className="text-gray-800">{item.unit}</span> : null}
                          </>
                        ) : (
                          "Qtd: —"
                        )}
                        {item.category ? (
                          <>
                            {" "}
                            • Categoria:{" "}
                            <span className="text-gray-800">{item.category}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="text-sm text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-full">
                      IA
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Rodapé de ajuda */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Dica: escreva do seu jeito, tipo “lista do mercado da semana” ou “remédios pra gripe”.
        </div>
      </div>
    </div>
  );
}

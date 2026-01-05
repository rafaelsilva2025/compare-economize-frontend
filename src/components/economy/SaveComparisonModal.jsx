import React, { useState } from "react";
import { apiRequest } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function SaveComparisonModal({
  open,
  onClose,
  marketChosen,
  totalChosen,
  totalCheapest,
  itemsCount,
}) {
  const [listName, setListName] = useState("Compra do mês");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const savings = Math.max(0, (totalChosen || 0) - (totalCheapest || 0));
  const isCheapest = totalChosen === totalCheapest;

  const generateHash = (date, listName, itemsCount, totalChosen, totalCheapest) => {
    const str = `${date}_${listName}_${itemsCount}_${totalChosen}_${totalCheapest}`;
    return btoa(str).replace(/=/g, "");
  };

  const getOrCreateGuestSessionId = () => {
    let sessionId = localStorage.getItem("guestSessionId");
    if (!sessionId) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem("guestSessionId", sessionId);
    }
    return sessionId;
  };

  const saveGuestSnapshotLocal = (snapshot) => {
    const key = "guestSavingsSnapshots";
    const list = JSON.parse(localStorage.getItem(key) || "[]");

    // evita duplicado local
    if (list.some((x) => x.comparisonHash === snapshot.comparisonHash)) {
      return false;
    }

    list.unshift(snapshot);
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  };

  const handleSave = async () => {
    if (!totalCheapest || totalCheapest === 0) {
      setError("Sem dados suficientes para calcular economia");
      return;
    }

    if (!listName.trim()) {
      setError("Digite um nome para a lista");
      return;
    }

    setSaving(true);
    setError("");

    const now = new Date().toISOString();
    const comparisonHash = generateHash(now, listName, itemsCount, totalChosen, totalCheapest);

    const snapshotBase = {
      date: now,
      listName: listName.trim(),
      marketChosen,
      totalChosen,
      totalCheapest,
      savings,
      itemsCount,
      comparisonHash,
    };

    try {
      // 1) Tenta modo logado (se falhar, vira visitante)
      let user = null;
      try {
        user = await apiRequest("/api/auth/me");
      } catch {
        user = null;
      }

      if (user?.id) {
        // 2) Checar duplicado no backend
        // (Se você ainda não tiver esse endpoint, pode remover esse bloco e deixar só o POST)
        try {
          const check = await apiRequest(
            `/api/savings/check?comparisonHash=${encodeURIComponent(comparisonHash)}`
          );
          if (check?.exists) {
            setError("Essa comparação já foi salva");
            setSaving(false);
            return;
          }
        } catch {
          // se o endpoint /check não existir ainda, ignora e segue para salvar
        }

        // 3) Salvar no backend
        await apiRequest("/api/savings", {
          method: "POST",
          body: JSON.stringify({
            ...snapshotBase,
            userId: user.id,
          }),
        });
      } else {
        // visitante: salvar local (sem depender do backend)
        const sessionId = getOrCreateGuestSessionId();
        const ok = saveGuestSnapshotLocal({
          ...snapshotBase,
          sessionId,
        });

        if (!ok) {
          setError("Essa comparação já foi salva");
          setSaving(false);
          return;
        }

        // Se você quiser também mandar para o backend como visitante no futuro:
        // await apiRequest("/api/savings/guest", { method:"POST", body: JSON.stringify({ ...snapshotBase, sessionId }) })
      }

      setSaved(true);
      toast.success("Economia registrada ✅", {
        description: 'Acesse "Minha Economia" para ver o histórico',
      });

      setTimeout(() => {
        onClose?.();
        setSaved(false);
        setListName("Compra do mês");
        setError("");
      }, 1500);
    } catch (err) {
      console.error("Error saving comparison:", err);
      setError("Erro ao salvar. Tente novamente.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar comparação</DialogTitle>
        </DialogHeader>

        {!saved ? (
          <div className="space-y-4 mt-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-600 mb-2 block">Nome da lista</label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Ex: Compra do mês"
              />
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mercado escolhido</span>
                <span className="font-semibold text-gray-900">{marketChosen}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total pago</span>
                <span className="font-semibold text-gray-900">
                  R$ {(totalChosen || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Menor preço</span>
                <span className="font-semibold text-gray-900">
                  R$ {(totalCheapest || 0).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between">
                {isCheapest ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Você escolheu o mais barato
                  </span>
                ) : (
                  <>
                    <span className="text-emerald-600 font-medium">Economia</span>
                    <span className="text-emerald-600 font-bold text-lg flex items-center gap-1">
                      <TrendingUp className="w-5 h-5" />
                      R$ {savings.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !listName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar economia"
              )}
            </Button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Economia registrada ✅</h3>
            <p className="text-sm text-gray-500">Acesse "Minha Economia" para ver o histórico</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

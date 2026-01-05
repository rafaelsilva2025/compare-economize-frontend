import React, { useState } from "react";
import { apiRequest } from "@/api/apiClient";
import { X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreateSponsorshipModal({
  open,
  onClose,
  businessId,
  selectedProductId = null,
}) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [days, setDays] = useState("");
  const queryClient = useQueryClient();

  // Set initial product if provided
  React.useEffect(() => {
    if (selectedProductId) setSelectedProduct(String(selectedProductId));
  }, [selectedProductId]);

  // Fetch products (sua API)
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        return await apiRequest("/api/products");
      } catch (e) {
        console.error("Erro ao buscar produtos:", e);
        return [];
      }
    },
  });

  const createSponsorship = useMutation({
    mutationFn: async ({ productId, dailyBudget, days }) => {
      // backend calcula start/end/totalBudget se quiser
      return await apiRequest("/api/sponsorships", {
        method: "POST",
        body: JSON.stringify({
          productId,
          businessId,
          dailyBudget,
          days,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Patrocínio criado com sucesso!");
      // invalida lista de patrocínios ativos
      queryClient.invalidateQueries({ queryKey: ["activeSponsorships"] });
      queryClient.invalidateQueries({ queryKey: ["sponsorships"] });
      onClose?.();
      setSelectedProduct("");
      setDailyBudget("");
      setDays("");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar patrocínio");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!businessId) {
      toast.error("businessId não informado");
      return;
    }

    if (!selectedProduct || !dailyBudget || !days) {
      toast.error("Preencha todos os campos");
      return;
    }

    const budget = Number(dailyBudget);
    const numDays = Number(days);

    if (!Number.isFinite(budget) || !Number.isFinite(numDays) || budget <= 0 || numDays <= 0) {
      toast.error("Valores devem ser maiores que zero");
      return;
    }

    createSponsorship.mutate({
      productId: selectedProduct,
      dailyBudget: budget,
      days: numDays,
    });
  };

  const totalBudget = (Number(dailyBudget) || 0) * (Number(days) || 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              type="button"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Criar Patrocínio de Produto
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="product">Produto</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dailyBudget">Valor por dia (R$)</Label>
            <Input
              id="dailyBudget"
              type="number"
              step="0.01"
              min="0"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="Ex: 10.00"
            />
            <p className="text-xs text-gray-500 mt-1">Quanto você quer investir por dia</p>
          </div>

          <div>
            <Label htmlFor="days">Quantidade de dias</Label>
            <Input
              id="days"
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Ex: 7"
            />
            <p className="text-xs text-gray-500 mt-1">Por quantos dias você quer patrocinar</p>
          </div>

          {totalBudget > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-600">Investimento total:</span>
                <span className="text-2xl font-bold text-gray-900">
                  R$ {totalBudget.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                R$ {Number(dailyBudget || 0).toFixed(2)}/dia × {Number(days || 0)} dias
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createSponsorship.isPending}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              {createSponsorship.isPending ? "Criando..." : "Criar patrocínio"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

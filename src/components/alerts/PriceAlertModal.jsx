import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/api/apiClient";
import { toast } from 'sonner';

export default function PriceAlertModal({ open, onClose, product, currentPrice }) {
  const [targetPrice, setTargetPrice] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    const price = parseFloat(targetPrice);
    
    if (!price || price <= 0) {
      toast.error('Digite um preço válido');
      return;
    }

    if (currentPrice && price >= currentPrice) {
      toast.error(`O preço alvo deve ser menor que R$ ${currentPrice.toFixed(2)}`);
      return;
    }

    setIsCreating(true);

    try {
      const sessionId = localStorage.getItem('sessionId') || Date.now().toString();
      localStorage.setItem('sessionId', sessionId);

      // Check if user is authenticated
      let user = null;
      try {
        user = await base44.auth.me();
      } catch (error) {
        // User not authenticated
      }

      await base44.entities.PriceAlert.create({
        product: product.id,
        targetPrice: price,
        user: user?.id,
        sessionId: user ? undefined : sessionId,
        isActive: true,
      });

      toast.success('Alerta criado! Você será notificado quando o preço cair.');
      onClose();
      setTargetPrice('');
    } catch (error) {
      toast.error('Erro ao criar alerta. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            Criar alerta de preço
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{product?.name}</p>
            {currentPrice && (
              <p className="text-xs text-gray-500 mt-1">
                Menor preço atual: <span className="font-semibold text-emerald-600">R$ {currentPrice.toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Target Price Input */}
          <div>
            <label className="text-sm font-medium text-gray-900 mb-2 block">
              Quero ser avisado quando o preço for menor que:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Você receberá uma notificação quando o preço atingir seu alvo
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              <strong>Como funciona:</strong> Monitore o preço deste produto automaticamente. 
              Quando cair abaixo do seu alvo, você será notificado.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={isCreating}
            >
              {isCreating ? 'Criando...' : 'Criar alerta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
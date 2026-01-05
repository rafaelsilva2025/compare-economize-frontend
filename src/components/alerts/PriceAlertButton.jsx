import React, { useState } from 'react';
import { apiRequest } from "@/api/apiClient";
import { useQuery } from '@tanstack/react-query';
import { Bell, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { checkUserPlan, USER_FEATURES, FREE_LIMITS } from '@/components/premium/premiumUtils';
import PremiumUpgradeModal from '@/components/premium/PremiumUpgradeModal';
import PriceAlertModal from './PriceAlertModal';

export default function PriceAlertButton({ productId, disabled = false }) {
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check user plan
  const { data: planData } = useQuery({
    queryKey: ['userPlan'],
    queryFn: () => checkUserPlan(),
  });

  const tier = planData?.tier || 'free';
  const features = USER_FEATURES[tier.toUpperCase()] || USER_FEATURES.FREE;

  // Fetch user's alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['priceAlerts'],
    queryFn: async () => {
      try {
        const sessionId = localStorage.getItem('sessionId');
        let user = null;
        
        try {
          user = await base44.auth.me();
        } catch (error) {
          // Not authenticated
        }

        if (user) {
          return await base44.entities.PriceAlert.filter({ user: user.id, isActive: true });
        } else if (sessionId) {
          return await base44.entities.PriceAlert.filter({ sessionId, isActive: true });
        }
        return [];
      } catch (error) {
        return [];
      }
    },
  });

  const existingAlert = alerts.find(a => a.product === productId);
  const canAddAlert = features.UNLIMITED_ALERTS || alerts.length < FREE_LIMITS.MAX_ALERTS;

  const handleClick = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        toast.error('Faça login para criar alertas de preço');
        return;
      }
    } catch (error) {
      toast.error('Faça login para criar alertas de preço');
      return;
    }

    if (!canAddAlert && !existingAlert) {
      setShowUpgradeModal(true);
      return;
    }
    setShowAlertModal(true);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={disabled}
        className={`${existingAlert ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}`}
      >
        {!canAddAlert && !existingAlert ? <Lock className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
        {existingAlert ? 'Alerta ativo' : 'Criar alerta'}
      </Button>

      <PriceAlertModal
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        productId={productId}
        existingAlert={existingAlert}
      />

      <PremiumUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="price-alerts"
        planType="user"
      />
    </>
  );
}
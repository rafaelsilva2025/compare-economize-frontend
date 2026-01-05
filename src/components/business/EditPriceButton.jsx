import React, { useState } from 'react';
import { Edit, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { checkBusinessPlan, BUSINESS_FEATURES } from './businessUtils';
import BusinessUpgradeModal from './BusinessUpgradeModal';

export default function EditPriceButton({ businessId, onClick, disabled = false }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check business plan
  const { data: planData, isLoading } = useQuery({
    queryKey: ['businessPlan', businessId],
    queryFn: () => checkBusinessPlan(businessId),
    enabled: !!businessId,
  });

  const tier = planData?.tier || 'free';
  const canEdit = BUSINESS_FEATURES[tier.toUpperCase()]?.EDIT_PRICES || false;

  const handleClick = () => {
    if (!canEdit) {
      setShowUpgradeModal(true);
      return;
    }
    onClick?.();
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="animate-pulse">
        <Edit className="w-4 h-4 mr-2" />
        Carregando...
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={canEdit ? "default" : "outline"}
        onClick={handleClick}
        disabled={disabled}
        className={!canEdit ? "text-gray-400" : ""}
      >
        {canEdit ? <Edit className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
        Editar preços
      </Button>

      <BusinessUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="edit-prices"
        requiredTier="pro"
      />
    </>
  );
}
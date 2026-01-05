import React, { useState } from 'react';
import { BarChart3, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { checkBusinessPlan, BUSINESS_FEATURES } from './businessUtils';
import BusinessUpgradeModal from './BusinessUpgradeModal';

export default function ReportsButton({ businessId, onClick, disabled = false }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check business plan
  const { data: planData, isLoading } = useQuery({
    queryKey: ['businessPlan', businessId],
    queryFn: () => checkBusinessPlan(businessId),
    enabled: !!businessId,
  });

  const tier = planData?.tier || 'free';
  const canViewReports = BUSINESS_FEATURES[tier.toUpperCase()]?.FULL_REPORTS || false;

  const handleClick = () => {
    if (!canViewReports) {
      setShowUpgradeModal(true);
      return;
    }
    onClick?.();
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="animate-pulse">
        <BarChart3 className="w-4 h-4 mr-2" />
        Carregando...
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={canViewReports ? "default" : "outline"}
        onClick={handleClick}
        disabled={disabled}
        className={!canViewReports ? "text-gray-400" : ""}
      >
        {canViewReports ? <BarChart3 className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
        Relatórios
      </Button>

      <BusinessUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="reports"
        requiredTier="premium"
      />
    </>
  );
}
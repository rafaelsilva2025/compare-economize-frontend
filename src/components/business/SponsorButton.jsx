import React, { useState } from 'react';
import { Star, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { checkBusinessPlan, BUSINESS_FEATURES } from './businessUtils';
import BusinessUpgradeModal from './BusinessUpgradeModal';
import CreateSponsorshipModal from './CreateSponsorshipModal';

export default function SponsorButton({ businessId, disabled = false }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSponsorshipModal, setShowSponsorshipModal] = useState(false);

  // Check business plan
  const { data: planData, isLoading } = useQuery({
    queryKey: ['businessPlan', businessId],
    queryFn: () => checkBusinessPlan(businessId),
    enabled: !!businessId,
  });

  const tier = planData?.tier || 'free';
  const canSponsor = BUSINESS_FEATURES[tier.toUpperCase()]?.PRODUCT_SPONSORSHIP || false;

  const handleClick = () => {
    if (!canSponsor) {
      setShowUpgradeModal(true);
      return;
    }
    setShowSponsorshipModal(true);
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="animate-pulse">
        <Star className="w-4 h-4 mr-2" />
        Carregando...
      </Button>
    );
  }

  return (
    <>
      <Button
        variant={canSponsor ? "default" : "outline"}
        onClick={handleClick}
        disabled={disabled}
        className={canSponsor ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" : "text-gray-400"}
      >
        {canSponsor ? <Star className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
        Patrocinar
      </Button>

      <BusinessUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="sponsor"
        requiredTier="premium"
      />

      <CreateSponsorshipModal
        open={showSponsorshipModal}
        onClose={() => setShowSponsorshipModal(false)}
        businessId={businessId}
      />
    </>
  );
}
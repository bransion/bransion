'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const TIER_RANK: Record<string, number> = {
  none: 0,
  basic: 1,
  standard: 2,
  premium: 3,
};

interface Props {
  tier: 'basic' | 'standard' | 'premium';
  price: number;
  currentTier: string;
  pendingBrandId?: string;
  referralCode?: string;
}

export function TierButton({
  tier,
  price,
  currentTier,
  pendingBrandId,
  referralCode,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const currentRank = TIER_RANK[currentTier] ?? 0;
  const tierRank = TIER_RANK[tier];

  // Disabled if user already has this tier OR a higher tier (no downgrade)
  const isDisabled = tierRank <= currentRank;

  const label =
    tierRank === currentRank
      ? 'Current plan'
      : tierRank < currentRank
        ? 'Already have higher tier'
        : `Pay ₦${price.toLocaleString()}`;

  async function handleClick() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'tier',
          tier,
          pending_brand_id: pendingBrandId ?? null,
          referral_code: referralCode || null,
        }),
      });

      const data = (await res.json()) as {
        authorization_url?: string;
        error?: string;
      };

      if (!res.ok || !data.authorization_url) {
        throw new Error(data.error ?? 'Could not start payment');
      }
      window.location.href = data.authorization_url;
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    }
  }

  return (
    <Button
      className="w-full"
      onClick={handleClick}
      disabled={submitting || isDisabled}
      variant={isDisabled ? 'outline' : 'default'}
    >
      {submitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
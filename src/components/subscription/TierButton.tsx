// =====================================================================
// BRANSION — Tier purchase button (client).
// POSTs to /api/paystack/initialize with purpose='tier', gets the
// authorization_url, redirects. If user is already on this tier,
// button shows "Current plan" (disabled).
// =====================================================================
'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  tier: 'basic' | 'standard' | 'premium';
  price: number;
  currentTier: string;
  pendingBrandId?: string;
  referralCode?: string;
}

export function TierButton({ tier, price, currentTier, pendingBrandId, referralCode }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const isCurrent = currentTier === tier;

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
      disabled={submitting || isCurrent}
      variant={isCurrent ? 'outline' : 'default'}
    >
      {isCurrent ? (
        'Current plan'
      ) : submitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting…
        </>
      ) : (
        `Pay ₦${price.toLocaleString()}`
      )}
    </Button>
  );
}
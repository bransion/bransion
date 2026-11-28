'use client';

import { useState } from 'react';
import { Crown, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TierButton } from './TierButton';
import { formatNaira } from '@/lib/utils';
import { TIER_PRICES, TIER_BRAND_LIMITS, TIER_MONTHLY_FEES } from '../../../types';

interface Props {
  userTier: string;
  successMessage: string | null;
  errorMessage: string | null;
  pendingBrandId?: string;
  isFirstPurchase?: boolean;
}

export function SubscriptionView({ userTier, successMessage, errorMessage, pendingBrandId, isFirstPurchase = true }: Props) {
  const [referralCode, setReferralCode] = useState('');

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Choose your tier</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One-time payment. Unlock brand slots and start selling today. Monthly maintenance fee applies.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Referral Input Section - ONLY SHOW ON FIRST PURCHASE */}
      {isFirstPurchase && (
      <div className="max-w-md mx-auto rounded-lg border bg-muted/30 p-4 space-y-2">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Were you referred by someone? (Optional)
        </Label>
        <Input 
          placeholder="Enter their BRN-XXXX-YY code" 
          value={referralCode} 
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
          maxLength={11}
        />
        <p className="text-[11px] text-muted-foreground">
          If you have a referral code, enter it here before paying. The person who referred you will earn a commission on your payment and future sales.
        </p>
      </div>
      )}

      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(['basic', 'standard', 'premium'] as const).map((tier) => {
          const price = TIER_PRICES[tier];
          const slots = TIER_BRAND_LIMITS[tier];
          const fee = TIER_MONTHLY_FEES[tier];
          const isPopular = tier === 'standard';

          return (
            <div
              key={tier}
              className={`rounded-lg border bg-card p-6 flex flex-col relative shadow-sm ${
                isPopular ? 'border-[#0B0B0F] dark:border-white ring-2 ring-[#0B0B0F]/10 dark:ring-white/10 shadow-md' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white dark:from-white dark:to-gray-300 dark:text-[#0B0B0F] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                  Most popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                {tier === 'premium' && <Crown className="h-5 w-5 text-amber-500" />}
                <h2 className="text-xl font-bold capitalize">{tier}</h2>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold">{formatNaira(price)}</span>
                <p className="text-xs text-muted-foreground mt-1">
                  one-time · {formatNaira(fee)}/month maintenance
                </p>
              </div>

              <ul className="space-y-2 text-sm flex-1 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{slots === null ? 'Unlimited brands' : `${slots} brand slot${slots > 1 ? 's' : ''}`}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Keep 70% of every sale</span>
                </li>
                                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>
                    {tier === 'basic'
                      ? '1 product upload total'
                      : tier === 'standard'
                        ? 'Up to 3 products per brand'
                        : 'Unlimited product uploads'}
                  </span>
                </li>
              </ul>

              <TierButton
                tier={tier}
                price={price}
                currentTier={userTier}
                pendingBrandId={pendingBrandId}
                referralCode={referralCode}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
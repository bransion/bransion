// =====================================================================
// BRANSION — Referral card (client).
// Copy code, share via WhatsApp/X, tier-aware upgrade nudge.
// Icons: only Copy/Check/Users/TrendingUp/Sparkles/MessageCircle/Share2
// (all verified present in lucide-react).
// =====================================================================
'use client';

import { useState } from 'react';
import {
  Copy,
  Check,
  Users,
  TrendingUp,
  Sparkles,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';

interface Props {
  code: string | null;
  referredCount: number;
  totalEarned: number;
  missedEarnings: number;
  tier: 'basic' | 'standard' | 'premium';
}

export function ReferralCard({
  code,
  referredCount,
  totalEarned,
  missedEarnings,
  tier,
}: Props) {
  const [copied, setCopied] = useState(false);

  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = code ? `${siteUrl}/sign-up?ref=${code}` : '';

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — user can still manually select the code.
    }
  }

  function handleShare(platform: 'whatsapp' | 'twitter') {
    if (!shareUrl) return;
    const message = `Join Bransion with my referral code ${code} and start selling custom apparel!`;
    const url =
      platform === 'whatsapp'
        ? `https://wa.me/?text=${encodeURIComponent(`${message} ${shareUrl}`)}`
        : `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            message
          )}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (!code) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Referral code unavailable. Contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Invite &amp; Earn</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Earn <strong>10%</strong> of every tier purchase your referrals make,
          plus lifetime commission on their sales.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 rounded-md border bg-muted/30 px-4 py-3 font-mono text-base tracking-wider flex items-center">
          {code}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          aria-label="Copy referral code"
          className="h-auto"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            Referrals
          </div>
          <div className="text-xl font-bold">{referredCount}</div>
        </div>
        <div className="rounded-md bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Lifetime Earned
          </div>
          <div className="text-xl font-bold">{formatNaira(totalEarned)}</div>
        </div>
      </div>

      {tier === 'basic' && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2 text-xs">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                You&apos;re missing out on lifetime commissions
              </p>
              <p className="text-muted-foreground mt-1">
                Upgrade to Standard (2%) or Premium (5%) to earn a cut of every
                sale your referrals make.
                {missedEarnings > 0 && (
                  <>
                    {' '}
                    You&apos;ve already missed {formatNaira(missedEarnings)}.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {tier === 'standard' && (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/5 p-3">
          <div className="flex items-start gap-2 text-xs">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-400">
                You&apos;re earning 2% lifetime
              </p>
              <p className="text-muted-foreground mt-1">
                Premium gives you 5% on every referral sale.
                {missedEarnings > 0 && (
                  <> You&apos;ve missed {formatNaira(missedEarnings)} so far.</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleShare('whatsapp')}
        >
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
          WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleShare('twitter')}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Twitter/X
        </Button>
      </div>
    </div>
  );
}
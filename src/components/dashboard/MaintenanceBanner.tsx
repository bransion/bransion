// =====================================================================
// BRANSION — Maintenance fee banner.
// Server component — receives computed values as props.
// Shows only when the creator has a tier OR has unpaid invoices.
// Amber styling when unpaid balance > 0.
// =====================================================================
import { Calendar, AlertCircle } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

interface Props {
  tier: string;
  monthlyFee: number;
  nextChargeDate: string;
  unpaidTotal: number;
}

export function MaintenanceBanner({
  tier,
  monthlyFee,
  nextChargeDate,
  unpaidTotal,
}: Props) {
  // Show if there's a tier OR unpaid invoices exist (edge case: tier
  // downgraded but old invoices lingering).
  if (tier === 'none' && unpaidTotal === 0) {
    return null;
  }

  const hasUnpaid = unpaidTotal > 0;

  return (
    <div
      className={
        hasUnpaid
          ? 'rounded-lg border border-amber-500/40 bg-amber-500/5 p-4'
          : 'rounded-lg border bg-muted/30 p-4'
      }
    >
      <div className="flex items-start gap-3">
        {hasUnpaid ? (
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}

        <div className="flex-1 min-w-0 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-medium text-foreground">
              Monthly maintenance
            </span>
            {tier !== 'none' && (
              <span className="text-xs uppercase font-medium text-muted-foreground">
                · {tier} tier
              </span>
            )}
          </div>

          <div className="mt-1 text-muted-foreground">
            {tier !== 'none' ? (
              <>
                <span className="text-foreground font-medium">
                  {formatNaira(monthlyFee)}/month
                </span>{' '}
                · Next charge: {nextChargeDate}
              </>
            ) : (
              <>No active subscription — invoices remain from prior activity.</>
            )}
          </div>

          <div className="mt-1">
            {hasUnpaid ? (
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Unpaid balance: {formatNaira(unpaidTotal)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                All settled. ✓
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
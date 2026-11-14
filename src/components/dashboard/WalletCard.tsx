// =====================================================================
// BRANSION — Wallet summary card.
// Server component — receives data as props.
// =====================================================================
import { Wallet, TrendingUp, Clock, ArrowDownToLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';

interface Props {
  available: number;
  pending: number;
  lifetime: number;
  withdrawable: number;
}

export function WalletCard({
  available,
  pending,
  lifetime,
  withdrawable,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-card p-5 md:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            Available Balance
          </span>
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-3xl font-bold tracking-tight">
          {formatNaira(available)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {withdrawable > 0
            ? `${formatNaira(withdrawable)} withdrawable`
            : 'Nothing withdrawable yet'}
        </p>
        {withdrawable > 0 && (
          <a href="#withdraw-section">
            <Button className="mt-4 w-full" size="sm">
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          </a>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Pending</span>
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {formatNaira(pending)}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Lifetime</span>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {formatNaira(lifetime)}
        </div>
      </div>
    </div>
  );
}
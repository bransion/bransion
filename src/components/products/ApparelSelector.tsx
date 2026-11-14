// =====================================================================
// BRANSION — Apparel picker (client).
// Grid of plain apparel. Each card shows ONLY the M price + M size —
// per Rule 1.5 creators never see other sizes' prices (they set markup
// on the M price; buyers see size multipliers at checkout).
// =====================================================================
'use client';

import { Check } from 'lucide-react';
import { formatNaira, cn } from '@/lib/utils';
import type { PlainApparel } from '../../../types';

interface Props {
  apparel: PlainApparel[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ApparelSelector({ apparel, selectedId, onSelect }: Props) {
  if (apparel.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-2">2. Pick your apparel</h2>
        <p className="text-sm text-muted-foreground">
          No apparel available right now. Contact support.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h2 className="font-semibold">2. Pick your apparel</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Prices shown are for size M. Other sizes are available to buyers at
          checkout with their own price multipliers.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {apparel.map((a) => {
          const selected = a.id === selectedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                'relative rounded-lg border bg-background overflow-hidden text-left transition-all',
                selected
                  ? 'border-[#0B0B0F] dark:border-white ring-2 ring-[#0B0B0F]/20 dark:ring-white/20'
                  : 'hover:border-foreground/40'
              )}
            >
              {selected && (
                <div className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F] flex items-center justify-center">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="aspect-square bg-muted">
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image_url}
                    alt={a.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="p-2.5">
                <div className="text-xs font-medium truncate">{a.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Size M · {formatNaira(Number(a.base_medium_price))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
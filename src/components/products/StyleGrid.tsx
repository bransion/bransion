// =====================================================================
// BRANSION — Print style picker (client).
// Shows all active styles from style_markups with their cost_modifier.
// =====================================================================
'use client';

import { Check } from 'lucide-react';
import { formatNaira, cn } from '@/lib/utils';

export interface StyleOption {
  code: string;
  name: string;
  description: string | null;
  cost_modifier: number;
}

interface Props {
  styles: StyleOption[];
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function StyleGrid({ styles, selectedCode, onSelect }: Props) {
  if (styles.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-2">Choose your print style</h2>
        <p className="text-sm text-muted-foreground">
          No print styles available right now. Contact support.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h2 className="font-semibold">Choose your print style</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Extra printing cost is added to the base apparel price. This is a
          production cost, not part of your profit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {styles.map((s) => {
          const selected = s.code === selectedCode;
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => onSelect(s.code)}
              className={cn(
                'relative rounded-lg border bg-background p-4 text-left transition-all duration-200',
                selected
                  ? 'border-[#0B0B0F] dark:border-white ring-2 ring-[#0B0B0F]/20 dark:ring-white/20'
                  : 'hover:border-foreground/40 hover:shadow-sm'
              )}
            >
              {selected && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F] flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}

              <div className="pr-8">
                <div className="font-medium text-sm">{s.name}</div>
                {s.description && (
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {s.description}
                  </div>
                )}
              </div>

              <div className="mt-3">
                {s.cost_modifier > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                    +{formatNaira(Number(s.cost_modifier))}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 text-[11px] font-medium">
                    No extra cost
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
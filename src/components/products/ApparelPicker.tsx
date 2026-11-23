'use client';

import { useState } from 'react';
import { Search, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatNaira, cn } from '@/lib/utils';

interface Props {
  apparels: any[];
  selectedId: string | null;
  onSelect: (apparel: any) => void;
}

export function ApparelPicker({ apparels, selectedId, onSelect }: Props) {
  const [q, setQ] = useState('');
  const filtered = apparels.filter((a) =>
    a.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="font-semibold text-lg">2. Choose Base Apparel</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Select the garment you want to print on. Review the quality before choosing.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search apparel..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No apparel available yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((a) => {
            const selected = a.id === selectedId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a)}
                className={cn(
                  'relative rounded-lg border bg-background p-3 text-left transition-all flex flex-col h-full',
                  selected
                    ? 'border-[#0B0B0F] dark:border-white ring-2 ring-[#0B0B0F]/20'
                    : 'hover:border-foreground/40'
                )}
              >
                {selected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F] flex items-center justify-center z-10">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <div className="aspect-square rounded-md overflow-hidden bg-muted mb-3">
                  <img
                    src={a.main_image_url}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  {a.category}
                </div>
                <div className="font-medium text-sm truncate">{a.name}</div>
                
                {/* Cloth Quality shown to creator */}
                {a.description && (
                  <div className="mt-2 flex items-start gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-1.5 rounded">
                    <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{a.description}</span>
                  </div>
                )}

                <div className="text-xs mt-2 font-semibold">
                  {formatNaira(a.default_base_cost)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-auto pt-1">
                  {a.sub_children_styles?.[0]?.count ?? 0} styles available
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
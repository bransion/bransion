'use client';

import { Check, MessageCircle } from 'lucide-react';
import { formatNaira, cn } from '@/lib/utils';

interface Props {
  styles: any[];
  selectedId: string | null;
  onSelect: (style: any) => void;
  apparelName: string;
}

const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT || '').replace(
  /\D/g,
  ''
);

const CUSTOM_DESIGN_URL = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      "Hi Bransion! I'd like to create a Custom Brand design."
    )}`
  : null;

export function StylePicker({
  styles,
  selectedId,
  onSelect,
  apparelName,
}: Props) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="font-semibold text-lg">3. Choose Print Style</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choose how your design will be placed on the {apparelName}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* ── Custom Design card (always FIRST) ─────────────────── */}
        {CUSTOM_DESIGN_URL && (
          <a
            href={CUSTOM_DESIGN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 text-left transition-all hover:border-emerald-500 hover:bg-emerald-500/10 block"
          >
            <div className="aspect-[4/3] rounded-md overflow-hidden bg-emerald-500/10 flex items-center justify-center mb-3">
              <MessageCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="font-semibold text-sm flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              Custom Design
              <span className="text-[9px] uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                Chat
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              Want something unique? Chat with our team on WhatsApp to design a
              custom placement for this apparel.
            </p>
            <div className="text-xs font-semibold mt-2 text-emerald-700 dark:text-emerald-400">
              Talk to us on WhatsApp →
            </div>
          </a>
        )}

        {/* ── Existing styles ───────────────────────────────────── */}
        {styles.map((s) => {
          const selected = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className={cn(
                'relative rounded-lg border bg-background p-4 text-left transition-all',
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
              <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.preview_image_url}
                  alt={s.style_title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-medium text-sm">{s.style_title}</div>
              {s.style_description && (
                <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {s.style_description}
                </div>
              )}
              <div className="text-xs font-semibold mt-2">
                {s.additional_cost_markup > 0
                  ? `+${formatNaira(s.additional_cost_markup)}`
                  : 'No extra cost'}
              </div>
            </button>
          );
        })}
      </div>

      {styles.length === 0 && !CUSTOM_DESIGN_URL && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          This apparel has no print styles configured yet.
        </p>
      )}
    </section>
  );
}
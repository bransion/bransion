// =====================================================================
// BRANSION — Product metadata + live pricing calculator (client).
// Zero inline math — all through lib/pricing.ts.
// Rule 2.1: 30% of MARKUP only. Cost price + style modifier untouched.
// =====================================================================
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { calculatePricing, calculatePricingWithStyle } from '@/lib/pricing';
import { formatNaira } from '@/lib/utils';

interface Props {
  name: string;
  description: string;
  markup: string;
  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setMarkup: (v: string) => void;
  costPrice: number;
  styleCostModifier?: number;
}

export function ProfitCalculator({
  name,
  description,
  markup,
  setName,
  setDescription,
  setMarkup,
  costPrice,
  styleCostModifier = 0,
}: Props) {
  const markupNum = Number(markup) || 0;
  const hasStyle = styleCostModifier > 0;
  const breakdown = hasStyle
    ? calculatePricingWithStyle(costPrice, styleCostModifier, markupNum)
    : {
        ...calculatePricing(costPrice, markupNum),
        styleModifier: 0,
        subtotalCost: costPrice,
      };

  return (
    <section className="rounded-lg border bg-card p-6 space-y-5">
      <div>
        <h2 className="font-semibold">4. Product details &amp; pricing</h2>
        <p className="text-xs text-muted-foreground mt-1">
          All fields are required. The product will go to review before
          appearing on the marketplace.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prod-name">Product Name *</Label>
        <Input
          id="prod-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Lagos Street Tee"
          maxLength={80}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prod-desc">Product Description *</Label>
        <Textarea
          id="prod-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell buyers what makes this design special"
          rows={3}
          maxLength={1000}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prod-markup">Your Added Profit (₦) *</Label>
        <Input
          id="prod-markup"
          type="number"
          inputMode="numeric"
          min="0"
          step="100"
          value={markup}
          onChange={(e) => setMarkup(e.target.value)}
          placeholder="e.g. 10000"
          required
        />
        <p className="text-xs text-muted-foreground">
          Added on top of the cost price. You keep 70% of it.
        </p>
      </div>

      <div className="rounded-lg bg-muted/30 p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
          Live breakdown
        </p>
        <div className="space-y-1.5 text-sm">
          <Row
            label={hasStyle ? 'Base M Price' : 'Cost Price'}
            value={formatNaira(breakdown.costPrice)}
            muted
          />
          {hasStyle && (
            <Row
              label="Style Modifier (printing)"
              value={`+${formatNaira(breakdown.styleModifier)}`}
              muted
            />
          )}
          {hasStyle && (
            <Row
              label="Total Cost"
              value={formatNaira(breakdown.subtotalCost)}
              muted
            />
          )}

          <Row
            label="Added Profit"
            value={formatNaira(breakdown.addedProfit)}
            muted
          />

          <div className="border-t pt-2">
            <Row
              label="Total Retail Price (Buyer pays)"
              value={formatNaira(breakdown.totalRetail)}
              bold
            />
          </div>

          <Row
            label="Bransion Fee (30% of profit)"
            value={formatNaira(breakdown.bransionFee)}
            muted
          />
          <div className="border-t pt-2">
            <Row
              label="Your Net Profit (70% of profit)"
              value={formatNaira(breakdown.netCreatorProfit)}
              bold
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2 border-t">
          Style modifier and delivery fee are 100% Bransion — they don&apos;t
          affect your 70% split.
        </p>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  );
}
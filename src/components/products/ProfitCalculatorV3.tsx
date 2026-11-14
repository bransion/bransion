"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcPricingV3 } from "@/lib/pricing";
import { formatNaira } from "@/lib/utils";

interface Props {
  apparel: any;
  style: any;
  markup: string;
  setMarkup: (v: string) => void;
}

export function ProfitCalculatorV3({
  apparel,
  style,
  markup,
  setMarkup,
}: Props) {
  const markupNum = Number(markup) || 0;
  const pricing = calcPricingV3(apparel, style, markupNum);

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <div>
        <h2 className="font-semibold text-lg">5. Set Your Profit</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your cost price is locked. You only set your profit markup.
        </p>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm flex justify-between items-center border">
        <span className="text-muted-foreground">
          Base Cost (M) + Style Placement
        </span>
        <span className="font-semibold">{formatNaira(pricing.baseCost)}</span>
      </div>

      <div className="space-y-1.5">
        <Label>Your Profit Markup (₦) *</Label>
        <Input
          type="number"
          min="1"
          value={markup}
          onChange={(e) => setMarkup(e.target.value)}
          placeholder="e.g. 10000"
          required
        />
      </div>

      <div className="rounded-lg bg-muted/30 p-4 space-y-2 text-sm mt-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Total Retail Price (Buyer pays)
          </span>
          <span className="font-semibold">
            {formatNaira(pricing.totalRetail)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bransion 30% Fee</span>
          <span>{formatNaira(pricing.bransionFee)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-right -mt-1">
          of your markup only — your cost price is never touched
        </p>

        <div className="border-t pt-2 flex justify-between font-semibold text-base">
          <span>Your Net Profit</span>
          <span className="text-green-600 dark:text-green-400">
            {formatNaira(pricing.creatorNet)}
          </span>
        </div>
      </div>
    </section>
  );
}

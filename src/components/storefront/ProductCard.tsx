'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingBag, Zap, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNaira, cn } from '@/lib/utils';
import { useCart } from '@/lib/store/cart';
import { ShareButton } from './ShareButton';

function pickFirst<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val.length > 0 ? val[0] : null;
  return val;
}

export function ProductCard({ product }: { product: any }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const apparel = pickFirst<any>(product.base_plain_apparel);
  const brand = pickFirst<any>(product.brands);
  const style = pickFirst<any>(product.sub_children_styles);
  const v2Apparel = pickFirst<any>(product.plain_apparel);

  const sizeModifiers: Record<string, number> =
    apparel?.size_price_modifiers || { M: 0 };
  const sizes = Object.keys(sizeModifiers);
  const [selectedSize, setSelectedSize] = useState(
    sizes.includes('M') ? 'M' : sizes[0] || 'M'
  );
  const [descExpanded, setDescExpanded] = useState(false);

  const baseCost = Number(apparel?.default_base_cost || 0);
  const styleCost = Number(style?.additional_cost_markup || 0);
  const markup = Number(product.user_profit_markup || 0);
  const sizeMod = Number(sizeModifiers[selectedSize] || 0);

  const displayPrice = baseCost + styleCost + markup + sizeMod;
  const brandSlug = brand?.slug ?? 'bransion';
  const detailHref = `/store/${brandSlug}/product/${product.id}`;

  const imageUrl =
    product.final_composite_product_url ||
    product.final_image_url ||
    product.design_url ||
    apparel?.main_image_url ||
    v2Apparel?.image_url ||
    'https://placehold.co/600x600/0B0B0F/E5E5EA?text=Product';

  // ── Cloth Quality — V3 base_plain_apparel description ONLY ─────
  // (V2 `plain_apparel.description` is ignored — it's legacy seed data.)
    const clothQuality =
    typeof apparel?.description === 'string' && apparel.description.trim().length > 0
      ? apparel.description.trim()
      : null;

  // DEBUG: remove after verifying
  if (typeof window === 'undefined') {
    console.log('[ProductCard]', product.name, {
      hasApparel: !!apparel,
      apparelName: apparel?.name,
      description: apparel?.description,
      clothQuality,
    });
  }

  const descriptionText = product.description || 'No description provided.';
  const shouldTruncate = descriptionText.length > 80;

  function handleAddToCart() {
    if (!selectedSize) return toast.error('Please select a size');
    addToCart({
      productId: product.id,
      size: selectedSize,
      name: product.name,
      brandName: brand?.name ?? 'Bransion',
      brandSlug,
      imageUrl,
      sizePrice: baseCost + styleCost + sizeMod,
      markup,
    });
    toast.success('Added to cart');
  }

  function handleBuyNow() {
    if (!selectedSize) return toast.error('Please select a size');
    router.push(`/checkout?product=${product.id}&size=${selectedSize}`);
  }

  return (
    <div className="group rounded-lg border bg-card overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
      <Link
        href={detailHref}
        className="block aspect-square relative bg-muted overflow-hidden"
      >
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider truncate mb-1">
            {brand?.name ?? 'Bransion'}
          </div>
          <Link
            href={detailHref}
            className="font-semibold text-lg leading-tight line-clamp-1 hover:underline"
          >
            {product.name}
          </Link>
        </div>

        {/* CLOTH QUALITY — only if description exists. No fallback. */}
        {clothQuality && (
          <div className="flex items-start gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 rounded-md w-fit max-w-full">
            <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{clothQuality}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground leading-relaxed">
          <span
            className={cn(
              shouldTruncate && !descExpanded ? 'line-clamp-2' : 'block'
            )}
          >
            {descriptionText}
          </span>
          {shouldTruncate && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setDescExpanded(!descExpanded);
              }}
              className="text-[11px] font-semibold text-foreground hover:underline mt-1 block focus:outline-none"
            >
              {descExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {sizes.length > 0 && (
          <Select
            value={selectedSize}
            onValueChange={(v) => v && setSelectedSize(v)}
          >
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s} —{' '}
                  {formatNaira(
                    baseCost + styleCost + markup + (sizeModifiers[s] || 0)
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="text-xl font-bold mt-auto pt-2">
          {formatNaira(displayPrice)}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={handleAddToCart}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Add
          </Button>
          <Button size="sm" onClick={handleBuyNow}>
            <Zap className="mr-2 h-4 w-4" /> Buy
          </Button>
        </div>

        <div className="pt-1">
          <ShareButton
            url={detailHref}
            title={product.name}
            className="w-full h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
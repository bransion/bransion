'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareButton } from '@/components/storefront/ShareButton';
import { formatNaira } from '@/lib/utils';
import { useCart } from '@/lib/store/cart';
import { calcBuyerSizePrice } from '@/lib/pricing';

export function ProductDetailV3Client({ product }: { product: any }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const apparel = product.base_plain_apparel;
  const style = product.sub_children_styles;
  
  const availableSizes = apparel?.size_price_modifiers 
    ? Object.keys(apparel.size_price_modifiers)
    : [];

  const defaultSize = availableSizes.includes('M') ? 'M' : availableSizes[0] || '';
  const [selectedSize, setSelectedSize] = useState(defaultSize);

  const markup = Number(product.user_profit_markup || 0);
  const currentPrice = (apparel && style && selectedSize) 
    ? calcBuyerSizePrice(apparel, style, selectedSize, markup)
    : (product.total_retail_price || 0);

  function handleAdd() {
    if (!selectedSize || !apparel || !style) return;
    const sizeMod = apparel.size_price_modifiers[selectedSize] || 0;
    const baseCost = apparel.default_base_cost + sizeMod + style.additional_cost_markup;

    addToCart({
      productId: product.id,
      size: selectedSize,
      name: product.name,
      brandName: product.brands?.name ?? 'Bransion',
      brandSlug: product.brands?.slug ?? 'bransion',
      imageUrl: product.final_composite_product_url,
      sizePrice: baseCost,
      markup,
    });
  }

  function handleBuyNow() {
    if (!selectedSize) return;
    router.push(`/checkout?product=${product.id}&size=${selectedSize}`);
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl mx-auto">
        <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-sm border">
          {product.final_composite_product_url ? (
            <img src={product.final_composite_product_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">{product.brands?.name ?? 'Bransion'}</p>
            <div className="flex items-start justify-between gap-4 mt-1">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              <ShareButton url={`${process.env.NEXT_PUBLIC_SITE_URL || ''}/store/${product.brands?.slug}/product/${product.id}`} title={product.name} variant="outline" size="icon" className="flex-shrink-0" />
            </div>
            
            {style && <p className="text-sm font-medium mt-2">Placement: <span className="text-muted-foreground">{style.style_title}</span></p>}
          </div>

          {apparel?.description && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <Star className="h-3.5 w-3.5" /> {apparel.description}
            </div>
          )}

          <div className="text-3xl font-bold">{formatNaira(currentPrice)}</div>

          {availableSizes.length > 0 && (
            <div className="space-y-2 max-w-xs">
              <label className="text-sm font-medium">Select Size</label>
              <Select value={selectedSize} onValueChange={(v) => { if(v) setSelectedSize(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableSizes.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 max-w-md pt-4">
            <Button size="lg" variant="outline" className="flex-1" onClick={handleAdd}><ShoppingBag className="mr-2 h-5 w-5" /> Add to Cart</Button>
            <Button size="lg" className="flex-1" onClick={handleBuyNow}><Zap className="mr-2 h-5 w-5" /> Buy Now</Button>
          </div>

          {product.description && (
            <div className="pt-6 border-t mt-6">
              <h3 className="font-semibold mb-2">About this design</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
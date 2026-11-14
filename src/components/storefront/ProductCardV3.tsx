"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNaira } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { calcBuyerSizePrice } from "@/lib/pricing";

interface Props {
  product: any; // Using any here to avoid complex nested V3 type gymnastics, but it has joined apparel/style
}

export function ProductCardV3({ product }: Props) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const apparel = product.base_plain_apparel;
  const style = product.sub_children_styles;

  // Extract sizes that have a modifier defined (means they are available)
  const availableSizes = apparel?.size_price_modifiers
    ? Object.keys(apparel.size_price_modifiers).filter(
        (k) => apparel.size_price_modifiers[k] !== null,
      )
    : [];

  const defaultSize = availableSizes.includes("M")
    ? "M"
    : availableSizes[0] || "";
  const [selectedSize, setSelectedSize] = useState(defaultSize);

  const markup = Number(product.user_profit_markup || 0);

  const currentPrice =
    apparel && style && selectedSize
      ? calcBuyerSizePrice(apparel, style, selectedSize, markup)
      : product.total_retail_price || 0;

  const brandSlug = product.brands?.slug ?? "bransion";
  const detailHref = `/store/${brandSlug}/product/${product.id}`;

  function handleAddToCart() {
    if (!selectedSize || !apparel || !style)
      return toast.error("Please select a size");

    const sizeMod = apparel.size_price_modifiers[selectedSize] || 0;
    const baseCost =
      apparel.default_base_cost + sizeMod + style.additional_cost_markup;

    addToCart({
      productId: product.id,
      size: selectedSize,
      name: product.name,
      brandName: product.brands?.name ?? "Bransion",
      brandSlug,
      imageUrl: product.final_composite_product_url,
      sizePrice: baseCost,
      markup: markup,
    });
    toast.success("Added to cart");
  }

  function buyNow() {
    if (!selectedSize) return toast.error("Please select a size");
    router.push(`/checkout?product=${product.id}&size=${selectedSize}`);
  }

  return (
    <div className="group rounded-lg border bg-card overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
      <Link href={detailHref} className="block aspect-square relative bg-muted">
        {product.final_composite_product_url ? (
          <img
            src={product.final_composite_product_url}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="text-xs text-muted-foreground truncate">
            {product.brands?.name ?? "Bransion"}
          </div>
          <Link
            href={detailHref}
            className="font-medium truncate block hover:underline"
          >
            {product.name}
          </Link>
        </div>

        {availableSizes.length > 0 && (
          <Select
            value={selectedSize}
            onValueChange={(v) => {
              if (v) setSelectedSize(v);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose size" />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="text-lg font-semibold mt-auto">
          {formatNaira(currentPrice)}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleAddToCart}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Add
          </Button>
          <Button size="sm" onClick={buyNow}>
            <Zap className="mr-2 h-4 w-4" /> Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}

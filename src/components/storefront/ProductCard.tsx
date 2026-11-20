"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { ShareButton } from "./ShareButton";

export function ProductCard({ product }: { product: any }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.add);

  const sizeModifiers: Record<string, number> = product.base_plain_apparel
    ?.size_price_modifiers || { M: 0 };
  const sizes = Object.keys(sizeModifiers);
  const [selectedSize, setSelectedSize] = useState(
    sizes.includes("M") ? "M" : sizes[0] || "M",
  );

  const baseCost = Number(product.base_plain_apparel?.default_base_cost || 0);
  const styleCost = Number(
    product.sub_children_styles?.additional_cost_markup || 0,
  );
  const markup = Number(product.user_profit_markup || 0);
  const sizeMod = Number(sizeModifiers[selectedSize] || 0);

  const displayPrice = baseCost + styleCost + markup + sizeMod;
  const brandSlug = product.brands?.slug ?? "bransion";
  const detailHref = `/store/${brandSlug}/product/${product.id}`;

  const imageUrl =
    product.final_composite_product_url ||
    product.base_plain_apparel?.main_image_url ||
    "https://placehold.co/600x600/0B0B0F/E5E5EA?text=Product";

  function handleAddToCart() {
    addToCart({
      productId: product.id,
      size: selectedSize,
      name: product.name,
      brandName: product.brands?.name ?? "Bransion",
      brandSlug,
      imageUrl,
      sizePrice: baseCost + styleCost + sizeMod,
      markup,
    });
    toast.success("Added to cart");
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

        {sizes.length > 0 && (
          <Select
            value={selectedSize}
            onValueChange={(v) => v && setSelectedSize(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s} —{" "}
                  {formatNaira(
                    baseCost + styleCost + markup + (sizeModifiers[s] || 0),
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="text-lg font-semibold mt-auto">
          {formatNaira(displayPrice)}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleAddToCart}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Add
          </Button>
          <Button
            size="sm"
            onClick={() =>
              router.push(
                `/checkout?product=${product.id}&size=${selectedSize}`,
              )
            }
          >
            <Zap className="mr-2 h-4 w-4" /> Buy
          </Button>
        </div>

        <div className="mt-1">
          <ShareButton
            url={`${process.env.NEXT_PUBLIC_SITE_URL || ""}/store/${brandSlug}/product/${product.id}`}
            title={product.name}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

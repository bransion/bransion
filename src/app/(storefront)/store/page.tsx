import { createClient } from "@/lib/supabase/server";
import { ProductCardV3 } from "@/components/storefront/ProductCardV3";
import { Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StorePage() {
  const supabase = await createClient();

  // Fetch V3 published products
  const { data: products } = await supabase
    .from("products")
    .select(
      `
      *,
      brands(name, slug, logo_url),
      base_plain_apparel(default_base_cost, size_price_modifiers, description),
      sub_children_styles(additional_cost_markup, style_title)
    `,
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const list = products ?? [];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="mt-2 text-muted-foreground">
          Original apparel from independent Bransion creators.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No products yet. Be the first creator to launch a brand.
          </p>
          <Link href="/brands/new">
            <Button className="mt-6">Create a Brand</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map((p) => (
            <ProductCardV3 key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ProductRow,
  type ProductRowData,
} from "@/components/products/ProductRow";


export default async function ProductsPage() {
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: brands } = await supabase
    .from("brands")
    .select("id")
    .eq("creator_id", user.id);

  const brandIds = (brands ?? []).map((b) => b.id);

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, slug, final_composite_product_url, user_profit_markup, status, brands(name, slug)",
    )
    .in(
      "brand_id",
      brandIds.length > 0 ? brandIds : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("created_at", { ascending: false });

  const rows: ProductRowData[] = (products ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    design_url:
      p.final_composite_product_url ||
      "https://placehold.co/100x100?text=Pending",
    creator_markup: p.user_profit_markup || 0,
    status:
      p.status === "published"
        ? "live"
        : p.status === "rejected"
          ? "draft"
          : "draft",
    brand_name: p.brands?.name ?? null,
    brand_slug: p.brands?.slug ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage every product across your brands.
          </p>
        </div>
        <Link href="/products/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <h2 className="font-semibold">No products yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first product to start selling.
          </p>
          <Link href="/products/create">
            <Button className="mt-4">Create product</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Product
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Markup
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="py-3 px-4 text-xs font-medium text-muted-foreground uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// BRANSION — Brands list page.
// Shows slot usage + grid of brands. "New Brand" button if slots available,
// "Upgrade" button if at limit.
// =====================================================================
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, Plus, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/storefront/ShareButton";
import { BrandCardMenu } from "@/components/dashboard/BrandCardMenu";

function getLimit(tier: string): number | "unlimited" {
  if (tier === "premium") return "unlimited";
  if (tier === "standard") return 5;
  if (tier === "basic") return 1;
  return 1; // tier='none' allows 1 pending
}

export default async function BrandsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();
  const tier = profile?.tier ?? "none";

  const { data: brands } = await supabase
    .from("brands")
    .select(
      "id, name, slug, logo_url, description, is_active, published_at, created_at",
    )
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const brandList = brands ?? [];
  const totalBrands = brandList.length;
  const limit = getLimit(tier);
  const limitStr = limit === "unlimited" ? "∞" : String(limit);
  const atLimit = limit !== "unlimited" && totalBrands >= limit;
  const hasSlot = !atLimit;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your brand storefronts.
          </p>
        </div>

        {hasSlot ? (
          <Link href="/brands/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Brand
            </Button>
          </Link>
        ) : (
          <Link href="/subscription">
            <Button>
              <ArrowRight className="mr-2 h-4 w-4" />
              Upgrade to add more
            </Button>
          </Link>
        )}
      </div>

      {/* Slot usage card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Brand slots</p>
              <p className="text-xs text-muted-foreground capitalize">
                {tier === "none" ? "No tier yet" : `${tier} tier`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">
              {totalBrands} / {limitStr}
            </p>
            {atLimit && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                At limit — upgrade to add more
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Brands grid */}
      {brandList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Store className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">No brands yet</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Create your first brand to start selling.
          </p>
          {hasSlot && (
            <Link href="/brands/new">
              <Button className="mt-6">Create your first brand</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brandList.map((brand) => (
            <div
              key={brand.id}
              className="rounded-lg border bg-card overflow-hidden"
            >
              <div className="aspect-[2/1] bg-muted relative">
                <div className="absolute top-2 right-2 z-10">
                  <BrandCardMenu brandId={brand.id} brandName={brand.name} />
                </div>
                {brand.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate">{brand.name}</h3>
                  <span
                    className={`text-[10px] uppercase font-medium px-2 py-0.5 rounded-full ${
                      brand.is_active
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {brand.is_active ? "Active" : "Pending"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  /{brand.slug}
                </p>
                  {brand.is_active ? (
                  <div className="flex items-center justify-between pt-1">
                    <Link
                      href={`/store/${brand.slug}`}
                      className="inline-flex items-center gap-1 text-xs text-foreground hover:underline"
                    >
                      View storefront <ExternalLink className="h-3 w-3" />
                    </Link>
                    <ShareButton
                      url={`${process.env.NEXT_PUBLIC_SITE_URL || ''}/store/${brand.slug}`}
                      title={`Check out ${brand.name} on Bransion!`}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                    />
                  </div>
                ) : (
                  <Link
                    href={`/subscription?pending_brand_id=${brand.id}`}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Complete payment to activate{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

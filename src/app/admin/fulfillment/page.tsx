import { connection } from "next/server";
import { getPendingV3Products } from "@/app/actions/admin-synthesis";
import { SynthesisCard } from "@/components/admin/SynthesisCard";
import { Package } from "lucide-react";

// Allow this route to block (fetch data at request time)
export const instant = false;

export default async function AdminFulfillmentPage() {
  await connection();

  const pendingProducts = await getPendingV3Products();

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Synthesis Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review creator submissions, download raw assets, and upload final
          composite images to publish.
        </p>
      </div>

      {pendingProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card/50 px-6 py-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            All caught up! There are no pending product submissions to review
            right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pendingProducts.map((p: any) => (
            <SynthesisCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

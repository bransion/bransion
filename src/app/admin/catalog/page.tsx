// =====================================================================
// BRANSION — Admin catalog page (server).
// Forces dynamic to prevent Date.now() prerender crash.
// =====================================================================
import { connection } from "next/server";
import { getCatalogData, type CatalogData } from "@/app/actions/admin-catalog";
import { CatalogView } from "@/components/admin/CatalogView";

export default async function AdminCatalogPage() {
  await connection();

  let data: CatalogData = { brands: [], products: [] };
  let error: string | null = null;

  try {
    data = await getCatalogData();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load catalog";
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return <CatalogView data={data} />;
} 

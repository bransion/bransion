// =====================================================================
// BRANSION — Admin products list (all statuses).
// =====================================================================
import { serviceRoleClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import Link from 'next/link';

export default async function AdminProductsPage() {
  const admin = serviceRoleClient();

  const { data: products } = await admin
    .from('products')
    .select(
      `id, name, slug, status, creator_markup, created_at,
       brands(name, slug, profiles!brands_creator_id_fkey(email))`
    )
    .order('created_at', { ascending: false })
    .limit(500);

  type Row = {
    id: string;
    name: string;
    slug: string;
    status: string;
    creator_markup: number;
    brands: {
      name: string;
      slug: string;
      profiles: { email: string } | null;
    } | null;
  };
  const list = (products ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All products across the platform.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-4 text-left">Product</th>
              <th className="py-3 px-4 text-left">Brand</th>
              <th className="py-3 px-4 text-right">Markup</th>
              <th className="py-3 px-4 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted-foreground">
                  No products yet.
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium truncate">{p.name}</td>
                  <td className="py-3 px-4">
                    <div className="text-xs">{p.brands?.name ?? '—'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.brands?.profiles?.email ?? ''}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {formatNaira(Number(p.creator_markup))}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'live'
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : p.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
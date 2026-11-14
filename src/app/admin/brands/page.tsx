// =====================================================================
// BRANSION — Admin brands list. Suspend/reactivate any brand.
// =====================================================================
import { serviceRoleClient } from '@/lib/supabase/server';
import { AdminActionButton } from '@/components/admin/AdminActionButton';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default async function AdminBrandsPage() {
  const admin = serviceRoleClient();

  const { data: brands } = await admin
    .from('brands')
    .select(
      `id, name, slug, is_active, created_at, published_at,
       profiles!brands_creator_id_fkey(email, full_name)`
    )
    .order('created_at', { ascending: false })
    .limit(500);

  type Row = {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
    profiles: { email: string; full_name: string | null } | null;
  };

  const list = (brands ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suspend or reactivate any brand. Suspended brands disappear from the
          public store.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-4 text-left">Brand</th>
              <th className="py-3 px-4 text-left">Creator</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-muted-foreground">
                  No brands yet.
                </td>
              </tr>
            ) : (
              list.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="font-medium truncate">{b.name}</div>
                    <Link
                      href={`/store/${b.slug}`}
                      className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:underline"
                      target="_blank"
                    >
                      /{b.slug} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs truncate">
                      {b.profiles?.full_name ?? '—'}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {b.profiles?.email ?? ''}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                        b.is_active
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {b.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      {b.is_active ? (
                        <AdminActionButton
                          action="brand.suspend"
                          payload={{ brandId: b.id }}
                          label="Suspend"
                          variant="destructive"
                          confirmMessage={`Suspend "${b.name}"? This removes it from the public store.`}
                        />
                      ) : (
                        <AdminActionButton
                          action="brand.reactivate"
                          payload={{ brandId: b.id }}
                          label="Reactivate"
                          confirmMessage={`Reactivate "${b.name}"?`}
                        />
                      )}
                    </div>
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
// =====================================================================
// BRANSION — Admin catalog client view (tabs + search + rows).
// =====================================================================
'use client';

import { useState } from 'react';
import { Search, Store, Package, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatNaira } from '@/lib/utils';
import { CatalogEditModal } from './CatalogEditModal';
import { ForceDeleteDialog } from './ForceDeleteDialog';
import type { CatalogData, CatalogBrand, CatalogProduct } from '@/app/actions/admin-catalog';

type Tab = 'brands' | 'products';

interface Props {
  data: CatalogData;
}

export function CatalogView({ data }: Props) {
  const [tab, setTab] = useState<Tab>('brands');
  const [q, setQ] = useState('');

  const [editBrand, setEditBrand] = useState<CatalogBrand | null>(null);
  const [editProduct, setEditProduct] = useState<CatalogProduct | null>(null);
  const [deleteBrand, setDeleteBrand] = useState<CatalogBrand | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<CatalogProduct | null>(null);

  const term = q.trim().toLowerCase();

  const filteredBrands = data.brands.filter((b) => {
    if (!term) return true;
    return (
      b.name.toLowerCase().includes(term) ||
      b.slug.toLowerCase().includes(term) ||
      (b.owner_email ?? '').toLowerCase().includes(term)
    );
  });

  const filteredProducts = data.products.filter((p) => {
    if (!term) return true;
    return (
      p.name.toLowerCase().includes(term) ||
      p.slug.toLowerCase().includes(term) ||
      (p.brand_name ?? '').toLowerCase().includes(term) ||
      (p.owner_email ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, edit, and force-delete any brand or product on Bransion.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="inline-flex rounded-md border p-1 bg-muted/30">
          <button
            onClick={() => setTab('brands')}
            className={cn(
              'px-4 py-1.5 rounded text-sm font-medium transition-colors',
              tab === 'brands'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            <Store className="inline h-3.5 w-3.5 mr-1.5" />
            Brands ({data.brands.length})
          </button>
          <button
            onClick={() => setTab('products')}
            className={cn(
              'px-4 py-1.5 rounded text-sm font-medium transition-colors',
              tab === 'products'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            <Package className="inline h-3.5 w-3.5 mr-1.5" />
            Products ({data.products.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, slug, or owner email"
            className="pl-9"
          />
        </div>
      </div>

      {tab === 'brands' && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left">Brand</th>
                <th className="py-3 px-4 text-left">Owner</th>
                <th className="py-3 px-4 text-left">Tier</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Products</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No brands match your search.
                  </td>
                </tr>
              ) : (
                filteredBrands.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                          {b.logo_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.logo_url} alt={b.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{b.name}</div>
                          <div className="text-xs text-muted-foreground truncate">/{b.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs truncate max-w-[200px]">
                      {b.owner_email ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-xs capitalize">{b.owner_tier}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full',
                          b.is_active
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{b.product_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setEditBrand(b)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteBrand(b)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'products' && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Brand</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Retail</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No products match your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                          {p.design_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.design_url} alt={p.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">/{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs truncate max-w-[200px]">
                      {p.brand_name ?? '—'}
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.owner_email ?? ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {p.review_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatNaira(p.retail_price)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setEditProduct(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteProduct(p)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

            {editBrand && (
        <CatalogEditModal
          mode="brand"
          entity={editBrand}
          open={true}
          onOpenChange={(o: boolean) => !o && setEditBrand(null)}
        />
      )}

      {editProduct && (
        <CatalogEditModal
          mode="product"
          entity={editProduct}
          open={true}
          onOpenChange={(o: boolean) => !o && setEditProduct(null)}
        />
      )}

      {deleteBrand && (
        <ForceDeleteDialog
          mode="brand"
          entity={deleteBrand}
          open={true}
          onOpenChange={(o: boolean) => !o && setDeleteBrand(null)}
        />
      )}

      {deleteProduct && (
        <ForceDeleteDialog
          mode="product"
          entity={deleteProduct}
          open={true}
          onOpenChange={(o: boolean) => !o && setDeleteProduct(null)}
        />
      )}
    </div>
  );
}
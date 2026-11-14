// =====================================================================
// BRANSION — Responsive product grid.
// Empty state uses a Lucide icon + text + optional CTA per PROMPT PART 7.
// =====================================================================
import { Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProductCard } from './ProductCard';
import type { ProductWithRelations } from '@/types/product';

interface Props {
  products: ProductWithRelations[];
  emptyMessage?: string;
  emptyCta?: { label: string; href: string };
}

export function ProductGrid({
  products,
  emptyMessage = 'No products yet.',
  emptyCta,
}: Props) {
  if (!products || products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {emptyMessage}
        </p>
        {emptyCta && (
          <Link href={emptyCta.href}>
            <Button className="mt-6">{emptyCta.label}</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
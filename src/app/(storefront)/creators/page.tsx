import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Store } from 'lucide-react';

export default async function CreatorsPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase
    .from('brands')
    .select('*, products(count)')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Our Creators</h1>
        <p className="mt-2 text-muted-foreground">Discover original apparel from independent Nigerian brands.</p>
      </div>

      {!brands || brands.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <h2 className="font-semibold">No creators yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check back soon to see new brands.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {brands.map((brand: any) => (
            <Link key={brand.id} href={`/store/${brand.slug}`} className="group flex flex-col items-center p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="h-20 w-20 rounded-full object-cover mb-4" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4 text-xl font-bold">
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <h3 className="font-semibold text-center">{brand.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{brand.products?.[0]?.count ?? 0} products</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
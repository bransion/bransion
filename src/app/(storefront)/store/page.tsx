import { createPublicClient } from '@/lib/supabase/public';
import { ProductGrid } from '@/components/storefront/ProductGrid';

export const revalidate = 60;

export default async function StorePage() {
  const supabase = createPublicClient();
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      brands(name, slug, logo_url),
      base_plain_apparel(*),
      sub_children_styles(*)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="mt-2 text-muted-foreground">
          Original apparel from independent Bransion creators.
        </p>
      </div>
      <ProductGrid
        products={(products ?? []) as any}
        emptyMessage="No products yet. Be the first creator to launch a brand on Bransion."
        emptyCta={{ label: 'Create a Brand', href: '/brands/new' }}
      />
    </div>
  );
}
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/storefront/ProductCard';
import { formatNaira } from '@/lib/utils';

export default async function ProductDetailPage({ params }: { params: Promise<{ brandSlug: string; id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select(`
      *, 
      brands(name, slug, logo_url), 
      base_plain_apparel(*), 
      sub_children_styles(*)
    `)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (!product) notFound();

  const imageUrl = product.final_composite_product_url || product.base_plain_apparel?.main_image_url || 'https://placehold.co/600x600/0B0B0F/E5E5EA?text=Product';

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl mx-auto">
        {/* Left: Big image */}
        <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-sm relative">
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        </div>

        {/* Right: Info + Card */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">{product.brands?.name}</p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">{product.name}</h1>
            {product.description && <p className="mt-3 text-muted-foreground leading-relaxed">{product.description}</p>}
          </div>

          <div className="max-w-sm">
            <ProductCard product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
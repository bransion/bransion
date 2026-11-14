import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductGrid } from '@/components/storefront/ProductGrid';

export default async function BrandPage({ params }: { params: Promise<{ brandSlug: string }> }) {
  const { brandSlug } = await params;
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, slug, description, logo_url, is_active')
    .eq('slug', brandSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!brand) notFound();

  const { data: products } = await supabase
    .from('products')
    .select(`*, base_plain_apparel(name, main_image_url), sub_children_styles(style_title)`)
    .eq('brand_id', brand.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 flex items-center gap-4">
        {brand.logo_url && <img src={brand.logo_url} alt={brand.name} className="h-16 w-16 rounded-full object-cover border" />}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
          {brand.description && <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{brand.description}</p>}
        </div>
      </div>
      <ProductGrid
        products={(products ?? []) as any}
        emptyMessage="This brand hasn't published any products yet. Check back soon."
        emptyCta={{ label: 'Browse all products', href: '/store' }}
      />
    </div>
  );
}
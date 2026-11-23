import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ShareButton } from '@/components/storefront/ShareButton';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ brandSlug: string; id: string }>;
}) {
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

  const imageUrl =
    product.final_composite_product_url ||
    product.base_plain_apparel?.main_image_url ||
    'https://placehold.co/600x600/0B0B0F/E5E5EA?text=Product';

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 max-w-6xl mx-auto">
        <div className="aspect-square rounded-xl overflow-hidden bg-muted shadow-sm relative">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {product.brands?.name}
            </p>

            {/* Title row with Share button */}
            <div className="flex items-start justify-between gap-4 mt-1">
              <h1 className="text-3xl font-bold tracking-tight flex-1">
                {product.name}
              </h1>
              <ShareButton
                url={`/store/${product.brands?.slug}/product/${product.id}`}
                title={product.name}
                variant="outline"
                size="icon"
                className="flex-shrink-0"
              />
            </div>

            {product.description && (
              <p className="mt-3 text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <div className="max-w-sm">
            <ProductCard product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
// =====================================================================
// BRANSION — Checkout page (V3 compatible).
// Buy Now mode:  /checkout?product=<uuid>&size=<size>
// Cart mode:     /checkout (reads Zustand cart on client)
// =====================================================================
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  CheckoutForm,
  type CheckoutItem,
} from '@/components/checkout/CheckoutForm';

export const metadata = { title: 'Checkout — Bransion' };

interface PageProps {
  searchParams: Promise<{ product?: string; size?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { product: productId, size } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/checkout');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  // ── Buy Now mode: fetch V3 product server-side ────────────────────
  let buyNowItem: CheckoutItem | null = null;

  if (productId && size) {
    const { data: rawProduct } = await supabase
      .from('products')
      .select(
        `
        id, name, user_profit_markup, status,
        final_composite_product_url,
        brands(name, slug, creator_id),
        base_plain_apparel(name, main_image_url, default_base_cost, size_price_modifiers)
      `
      )
      .eq('id', productId)
      .eq('status', 'published')
      .maybeSingle();

    if (!rawProduct) {
      redirect('/store');
    }

    // Supabase joins can return array OR object depending on FK detection.
    type RawProduct = {
      id: string;
      name: string;
      user_profit_markup: number | null;
      status: string;
      final_composite_product_url: string | null;
      brands:
        | { name: string; slug: string; creator_id: string }
        | { name: string; slug: string; creator_id: string }[]
        | null;
      base_plain_apparel:
        | {
            name: string;
            main_image_url: string | null;
            default_base_cost: number;
            size_price_modifiers: Record<string, number> | null;
          }
        | {
            name: string;
            main_image_url: string | null;
            default_base_cost: number;
            size_price_modifiers: Record<string, number> | null;
          }[]
        | null;
    };

    const product = rawProduct as unknown as RawProduct;

    const brand = Array.isArray(product.brands)
      ? product.brands[0]
      : product.brands;

    const apparel = Array.isArray(product.base_plain_apparel)
      ? product.base_plain_apparel[0]
      : product.base_plain_apparel;

    // Validate the size was offered by this apparel
    const sizeModifiers = apparel?.size_price_modifiers ?? { M: 0 };
    if (!(size in sizeModifiers)) {
      redirect('/store');
    }

    const baseCost = Number(apparel?.default_base_cost || 0);
    const sizeModifier = Number(sizeModifiers[size] || 0);
    const sizePrice = baseCost + sizeModifier;
    const markup = Number(product.user_profit_markup || 0);

    const imageUrl =
      product.final_composite_product_url ||
      apparel?.main_image_url ||
      'https://placehold.co/600x600/0B0B0F/E5E5EA?text=Product';

    buyNowItem = {
      productId: product.id,
      name: product.name,
      brandName: brand?.name ?? 'Bransion',
      brandSlug: brand?.slug ?? 'bransion',
      imageUrl,
      size,
      qty: 1,
      sizePrice,
      markup,
    };
  }

  return (
    <CheckoutForm
      buyNowItem={buyNowItem}
      defaultEmail={profile?.email ?? user.email ?? ''}
      defaultFullName={profile?.full_name ?? ''}
    />
  );
}
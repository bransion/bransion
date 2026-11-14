// =====================================================================
// BRANSION — Checkout page (Server Component wrapper).
// Two entry modes:
//   1. Buy Now:    /checkout?product=<uuid>&size=<size>
//   2. From cart:  /checkout (reads Zustand cart on client)
// Fetches product data server-side if Buy Now so the form always has
// accurate pricing (never trust URL numbers).
// =====================================================================
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CheckoutForm, type CheckoutItem } from '@/components/checkout/CheckoutForm';

export const metadata = { title: 'Checkout — Bransion' };

// Allow this route to block — it reads searchParams (?next= / ?error=)
export const instant = false;

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

  // ── Buy Now mode: fetch the item server-side ──────────────────────
  let buyNowItem: CheckoutItem | null = null;

  if (productId && size) {
  const { data: rawProduct } = await supabase
    .from('products')
    .select(`
      id, name, design_url, creator_markup, status,
      brands(name, slug, creator_id),
      plain_apparel(name, size_pricing(size, price))
    `)
    .eq('id', productId)
    .eq('status', 'live')
    .maybeSingle();

  if (!rawProduct) redirect('/store');

  // Supabase types joined relations as arrays even when the FK makes
  // them many-to-one (single objects at runtime). Cast to actual shape.
  const product = rawProduct as unknown as {
    id: string;
    name: string;
    design_url: string;
    creator_markup: number;
    brands: { name: string; slug: string; creator_id: string } | null;
    plain_apparel: {
      name: string;
      size_pricing: { size: string; price: number }[];
    } | null;
  };

  const sizePrice = product.plain_apparel?.size_pricing?.find(
    (s) => s.size === size
  );

  if (!sizePrice) redirect('/store');

  buyNowItem = {
    productId: product.id,
    name: product.name,
    brandName: product.brands?.name ?? 'Bransion',
    brandSlug: product.brands?.slug ?? 'bransion',
    imageUrl: product.design_url,
    size,
    qty: 1,
    sizePrice: Number(sizePrice.price),
    markup: Number(product.creator_markup),
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
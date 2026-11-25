// =====================================================================
// BRANSION — Admin order detail page.
// Shows EVERYTHING the buyer submitted: full name, phones, both addresses,
// state, LGA, notes, plus all line items and payment info.
// =====================================================================
import { createClient, serviceRoleClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  FileText,
  ShoppingBag,
  CreditCard,
  Calendar,
  Truck,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import { format } from 'date-fns';

export const metadata = { title: 'Order Details — Bransion Admin' };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const admin = serviceRoleClient();

  // Confirm caller is admin
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (callerProfile?.role !== 'admin') redirect('/store');

  const { data: order } = await admin
    .from('orders')
    .select(
      `
      *,
      buyer:profiles!orders_buyer_id_fkey(email, full_name),
      brand:brands(name, slug, profiles!brands_creator_id_fkey(email, full_name))
      `
    )
    .eq('id', id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await admin
    .from('order_items')
    .select(
      `
      id, size, size_price, markup, quantity, line_total,
      products(name, final_composite_product_url, base_plain_apparel(main_image_url))
      `
    )
    .eq('order_id', id);

  type ItemRow = {
    id: string;
    size: string;
    size_price: number;
    markup: number;
    quantity: number;
    line_total: number;
    products:
      | {
          name: string;
          final_composite_product_url: string | null;
          base_plain_apparel:
            | { main_image_url: string | null }
            | { main_image_url: string | null }[]
            | null;
        }
      | null;
  };

  const itemList = (items ?? []) as unknown as ItemRow[];

  const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
  const brand = Array.isArray(order.brand) ? order.brand[0] : order.brand;
  const brandOwner = brand
    ? Array.isArray(brand.profiles)
      ? brand.profiles[0]
      : brand.profiles
    : null;

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Order{' '}
            <span className="font-mono text-base text-muted-foreground">
              {order.id.slice(0, 8)}…
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed{' '}
            {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Buyer Info */}
      <Section title="Buyer Information" icon={<User className="h-4 w-4" />}>
        <Field label="Account Email" value={buyer?.email ?? '—'} />
        <Field
          label="Account Name"
          value={buyer?.full_name ?? '—'}
        />
        <Field label="Buyer ID" value={order.buyer_id ?? '—'} mono />
      </Section>

      {/* Shipping / Contact Info — everything they typed */}
      <Section
        title="Shipping & Contact (everything the buyer submitted)"
        icon={<MapPin className="h-4 w-4" />}
      >
        <Field label="Full Name" value={order.shipping_full_name} />
        <Field
          label="Primary Phone"
          value={order.shipping_primary_phone}
          icon={<Phone className="h-3 w-3" />}
        />
        <Field
          label="Secondary Phone"
          value={order.shipping_secondary_phone || '—'}
          icon={<Phone className="h-3 w-3" />}
        />
        <Field
          label="Current Address"
          value={order.shipping_current_address}
        />
        <Field
          label="Shipping Address"
          value={order.shipping_address}
        />
        <Field label="State" value={order.shipping_state} />
        <Field label="LGA" value={order.shipping_lga} />
      </Section>

      {/* Buyer's Note */}
      <Section
        title="Buyer's Note"
        icon={<StickyNote className="h-4 w-4" />}
      >
        {order.notes ? (
          <p className="text-sm whitespace-pre-wrap bg-muted/30 p-3 rounded-md border">
            {order.notes}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No note provided.
          </p>
        )}
      </Section>

      {/* Brand & Creator */}
      <Section
        title="Brand & Creator"
        icon={<ShoppingBag className="h-4 w-4" />}
      >
        <Field label="Brand" value={brand?.name ?? '—'} />
        <Field
          label="Brand Slug"
          value={brand?.slug ? `/${brand.slug}` : '—'}
          mono
        />
        <Field label="Creator Email" value={brandOwner?.email ?? '—'} />
        <Field label="Creator Name" value={brandOwner?.full_name ?? '—'} />
      </Section>

      {/* Items */}
      <Section title="Items Ordered" icon={<ShoppingBag className="h-4 w-4" />}>
        <div className="divide-y">
          {itemList.map((it) => {
            const apparel = Array.isArray(it.products?.base_plain_apparel)
              ? it.products?.base_plain_apparel[0]
              : it.products?.base_plain_apparel;
            const imageUrl =
              it.products?.final_composite_product_url ||
              apparel?.main_image_url ||
              'https://placehold.co/100x100/0B0B0F/E5E5EA?text=Item';

            return (
              <div
                key={it.id}
                className="py-3 flex items-center gap-3"
              >
                <div className="h-14 w-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={it.products?.name ?? 'Item'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {it.products?.name ?? 'Deleted product'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Size: {it.size} · Qty: {it.quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Unit: {formatNaira(it.size_price + it.markup)} (cost{' '}
                    {formatNaira(it.size_price)} + markup{' '}
                    {formatNaira(it.markup)})
                  </div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">
                  {formatNaira(it.line_total)}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Payment */}
      <Section
        title="Payment Information"
        icon={<CreditCard className="h-4 w-4" />}
      >
        <Field
          label="Payment Reference"
          value={order.payment_reference ?? '—'}
          mono
        />
        <Field
          label="Subtotal"
          value={formatNaira(
            Number(order.total_amount) - Number(order.delivery_fee)
          )}
        />
        <Field
          label="Delivery Fee"
          value={formatNaira(order.delivery_fee)}
        />
        <Field
          label="Total Paid"
          value={formatNaira(order.total_amount)}
        />
        <Field
          label="Paid At"
          value={
            order.paid_at
              ? format(new Date(order.paid_at), 'MMM d, yyyy h:mm a')
              : '—'
          }
          icon={<Calendar className="h-3 w-3" />}
        />
      </Section>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
        <Link href="/admin/fulfillment">
          <Button variant="outline">
            <Truck className="mr-2 h-4 w-4" />
            Go to Fulfillment
          </Button>
        </Link>
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    fulfilled: 'bg-green-500/10 text-green-700 dark:text-green-400',
    pending_payment: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    cancelled: 'bg-muted text-muted-foreground',
    refunded: 'bg-destructive/10 text-destructive',
  };
  return (
    <span
      className={`inline-block text-xs uppercase font-semibold px-3 py-1 rounded-full ${
        colors[status] ?? colors.cancelled
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-1.5 border-b border-dashed last:border-0 text-sm">
      <span className="text-muted-foreground text-xs sm:text-sm">{label}</span>
      <span
        className={`flex items-center gap-1.5 font-medium text-right break-words ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
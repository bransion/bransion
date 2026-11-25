// =====================================================================
// BRANSION — Checkout form (Client Component).
// Renders the compulsory shipping form + cart summary.
// Fetches LGA list based on selected state, shows live delivery fee.
// Submit → POST /api/orders/checkout → receives { authorization_url }
// → redirects browser to Paystack.
// =====================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Loader2, ShoppingBag } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNaira } from "@/lib/utils";
import Image from 'next/image';
import { NIGERIA_STATES } from "@/lib/nigeria-lga-complete";
import { quoteDeliveryFee } from "@/app/actions/admin-logistics";
import { useCart, cartSubtotal, type CartLine } from "@/lib/store/cart";

export interface CheckoutItem {
  productId: string;
  name: string;
  brandName: string;
  brandSlug: string;
  imageUrl: string;
  size: string;
  qty: number;
  sizePrice: number;
  markup: number;
}

interface Props {
  buyNowItem: CheckoutItem | null;
  defaultEmail: string;
  defaultFullName: string;
}

interface FormState {
  full_name: string;
  primary_phone: string;
  secondary_phone: string;
  current_address: string;
  shipping_address: string;
  state: string;
  lga: string;
  notes: string;
}

export function CheckoutForm({
  buyNowItem,
  defaultEmail,
  defaultFullName,
}: Props) {
  const router = useRouter();
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);

  const items: CheckoutItem[] = useMemo(() => {
    if (buyNowItem) return [buyNowItem];
    return cartItems.map((c: CartLine) => ({
      productId: c.productId,
      name: c.name,
      brandName: c.brandName,
      brandSlug: c.brandSlug,
      imageUrl: c.imageUrl,
      size: c.size,
      qty: c.qty,
      sizePrice: c.sizePrice,
      markup: c.markup,
    }));
  }, [buyNowItem, cartItems]);

  const [form, setForm] = useState<FormState>({
    full_name: defaultFullName,
    primary_phone: "",
    secondary_phone: "",
    current_address: "",
    shipping_address: "",
    state: "",
    lga: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // V3 Logistics State
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [fetchingFee, setFetchingFee] = useState(false);

  const subtotal = items.reduce(
    (s, i) => s + (i.sizePrice + i.markup) * i.qty,
    0,
  );

  // Use dynamic delivery fee from state, defaulting to 0 if not set
  const total = subtotal + (deliveryFee ?? 0);


  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));

    // Reset LGA and delivery fee if state changes
    if (key === "state") {
      setForm((f) => ({ ...f, state: value as string, lga: "" }));
      setDeliveryFee(null);
    }

    // Fetch dynamic delivery fee when LGA is selected
    if (key === "lga" && form.state) {
      setFetchingFee(true);
      quoteDeliveryFee(form.state, value as string).then((res) => {
        if (res.ok && typeof res.fee === "number") {
          setDeliveryFee(res.fee);
        } else {
          setDeliveryFee(null);
        }
        setFetchingFee(false);
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side pre-check (server validates again).
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.primary_phone.trim())
      return toast.error("Primary phone is required");
    if (!form.current_address.trim())
      return toast.error("Current address is required");
    if (!form.shipping_address.trim())
      return toast.error("Shipping address is required");
    if (!form.state) return toast.error("Select a state");
    if (!form.lga) return toast.error("Select an LGA");
    if (deliveryFee === null)
      return toast.error("Delivery fee not available for this location");

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            qty: i.qty,
          })),
          // API's Zod schema expects shipping_* prefixed fields.
          shipping_full_name: form.full_name,
          shipping_primary_phone: form.primary_phone,
          shipping_secondary_phone: form.secondary_phone || undefined,
          shipping_current_address: form.current_address,
          shipping_address: form.shipping_address,
          shipping_state: form.state,
          shipping_lga: form.lga,
          notes: form.notes || undefined,
        }),
      });

      const data = (await res.json()) as {
        authorization_url?: string;
        error?: string;
        issues?: Record<string, string[] | undefined>;
      };

      if (!res.ok || !data.authorization_url) {
        // Surface the first Zod field error so failures are obvious next time.
        const firstIssue = data.issues
          ? Object.values(data.issues).flat().filter(Boolean)[0]
          : undefined;
        throw new Error(firstIssue ?? data.error ?? "Could not start payment");
      }

      // Buy Now mode → cart stays clean.
      // Cart mode → clear it BEFORE leaving so we don't double-charge.
      if (!buyNowItem) clearCart();

      window.location.href = data.authorization_url;
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  }

    if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="text-sm text-muted-foreground">
            Add a product from the store to start your order.
          </p>
          <Link href="/store">
            <Button className="w-full">Browse the Store</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lgaOptions = form.state ? (NIGERIA_STATES[form.state] ?? []) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Checkout</h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
        >
          {/* ── LEFT: shipping form ──────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4 rounded-lg border bg-card p-6">
            <h2 className="font-semibold">Shipping information</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="primary_phone">Primary Phone *</Label>
                <Input
                  id="primary_phone"
                  type="tel"
                  placeholder="+234..."
                  value={form.primary_phone}
                  onChange={(e) => update("primary_phone", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="secondary_phone">
                Secondary Phone (optional)
              </Label>
              <Input
                id="secondary_phone"
                type="tel"
                value={form.secondary_phone}
                onChange={(e) => update("secondary_phone", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="current_address">Current Address *</Label>
              <Textarea
                id="current_address"
                rows={2}
                value={form.current_address}
                onChange={(e) => update("current_address", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shipping_address">Shipping Address *</Label>
              <Textarea
                id="shipping_address"
                rows={2}
                value={form.shipping_address}
                onChange={(e) => update("shipping_address", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>State *</Label>
                <Select
                  value={form.state}
                  onValueChange={(v) => {
                    if (v) update("state", v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(NIGERIA_STATES).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Local Government Area *</Label>
                <Select
                  value={form.lga}
                  onValueChange={(v) => {
                    if (v) update("lga", v);
                  }}
                  disabled={!form.state}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        form.state ? "Select LGA" : "Select state first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {lgaOptions.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Delivery notes (optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Landmark, gate colour, etc."
              />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Contact email</span>
                <span className="font-medium text-foreground">
                  {defaultEmail}
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: order summary ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4 rounded-lg border bg-card p-6 h-fit">
            <h2 className="font-semibold">Order summary</h2>

            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((i) => (
                <li
                  key={`${i.productId}-${i.size}`}
                  className="flex gap-3 text-sm"
                >
                  <div className="h-14 w-14 rounded overflow-hidden bg-muted flex-shrink-0 relative">
                    {i.imageUrl && (
                      <Image
                        src={i.imageUrl}
                        alt={i.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {i.size} · Qty {i.qty}
                    </div>
                  </div>
                  <div className="text-xs font-medium">
                    {formatNaira((i.sizePrice + i.markup) * i.qty)}
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>
                  {fetchingFee ? (
                    <span className="text-muted-foreground">
                      Calculating...
                    </span>
                  ) : deliveryFee !== null ? (
                    formatNaira(deliveryFee)
                  ) : form.lga ? (
                    <span className="text-destructive text-xs">
                      Not available
                    </span>
                  ) : (
                    "Select LGA"
                  )}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatNaira(total)}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                submitting ||
                fetchingFee ||
                (form.lga !== "" && deliveryFee === null)
              }
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Paystack…
                </>
              ) : (
                `Pay ${formatNaira(total)} via Paystack`
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              Secure payment powered by Paystack. You&apos;ll be redirected to
              complete your payment.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

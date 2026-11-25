'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, PackageSearch } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { format } from 'date-fns';

export default function TrackOrderPage() {
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<any>(null);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!reference || !phone) return toast.error('Enter reference and phone number');

    setBusy(true);
    setOrder(null);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total_amount, created_at, shipping_full_name')
      .eq('payment_reference', reference.trim())
      .eq('shipping_primary_phone', phone.trim())
      .maybeSingle();

    setBusy(false);

    if (error || !data) {
      toast.error('Order not found. Please check your details.');
    } else {
      setOrder(data);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="text-center mb-8">
        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Track your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your payment reference and the phone number used at checkout.
        </p>
      </div>

      <form onSubmit={handleTrack} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1.5">
          <Label>Payment Reference</Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 123e4567-e89b-12d3..."
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 08012345678"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Track Order'}
        </Button>
      </form>

      {order && (
        <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="font-semibold capitalize text-green-600 dark:text-green-400">
              {order.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span>{order.shipping_full_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span>{formatNaira(order.total_amount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
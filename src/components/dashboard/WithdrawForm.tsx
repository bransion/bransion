// =====================================================================
// BRANSION — Withdraw form (client component).
// Pre-validates against withdrawable amount, POSTs to /api/wallet/withdraw.
// =====================================================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNaira } from '@/lib/utils';

interface Props {
  withdrawable: number;
}

export function WithdrawForm({ withdrawable }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    bank_full_name: '',
    account_number: '',
    bank_name: '',
    phone: '',
  });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error('Enter a valid amount');
    }
    if (amount > withdrawable) {
      return toast.error(
        `You can only withdraw up to ${formatNaira(withdrawable)}`
      );
    }
    if (!form.bank_full_name.trim()) return toast.error('Full name is required');
    if (!/^[0-9]{10}$/.test(form.account_number)) {
      return toast.error('Account number must be exactly 10 digits');
    }
    if (!form.bank_name.trim()) return toast.error('Bank name is required');
    if (!form.phone.trim()) return toast.error('Phone number is required');

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bank_full_name: form.bank_full_name,
          account_number: form.account_number,
          bank_name: form.bank_name,
          phone: form.phone,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        issues?: Record<string, string[] | undefined>;
        withdrawal_id?: string;
      };

      if (!res.ok) {
        const firstIssue = data.issues
          ? Object.values(data.issues).flat().filter(Boolean)[0]
          : undefined;
        throw new Error(firstIssue ?? data.error ?? 'Withdrawal failed');
      }

      toast.success('Withdrawal request submitted', {
        description:
          'Bransion admin will review your request. Funds are typically sent within 24 hours.',
      });

      setForm({
        amount: '',
        bank_full_name: '',
        account_number: '',
        bank_name: '',
        phone: '',
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  }

    if (withdrawable <= 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Banknote className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You have no funds available to withdraw right now. Once you receive
          sale credits, they&apos;ll appear here for withdrawal.
        </p>
      </div>
    );
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-6 space-y-4"
    >
      <div>
        <h2 className="font-semibold">Withdraw funds</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Available: <strong>{formatNaira(withdrawable)}</strong>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount (₦) *</Label>
        <Input
          id="amount"
          type="number"
          min="1"
          max={withdrawable}
          step="0.01"
          value={form.amount}
          onChange={(e) => update('amount', e.target.value)}
          placeholder="Enter amount"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bank_full_name">Full Name (account holder) *</Label>
          <Input
            id="bank_full_name"
            value={form.bank_full_name}
            onChange={(e) => update('bank_full_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bank_name">Bank Name *</Label>
          <Input
            id="bank_name"
            value={form.bank_name}
            onChange={(e) => update('bank_name', e.target.value)}
            placeholder="e.g. GTBank"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="account_number">Account Number *</Label>
          <Input
            id="account_number"
            inputMode="numeric"
            maxLength={10}
            value={form.account_number}
            onChange={(e) =>
              update('account_number', e.target.value.replace(/\D/g, ''))
            }
            placeholder="10 digits"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+234..."
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          `Request withdrawal of ${form.amount ? formatNaira(Number(form.amount)) : '…'}`
        )}
      </Button>

      <p className="text-[11px] text-muted-foreground text-center">
        Bransion admin reviews each request manually. Funds are sent to your
        bank account within 24 hours of approval.
      </p>
    </form>
  );
}
// =====================================================================
// BRANSION — Reusable admin mutation button.
// 'use client' — POSTs to /api/admin/action, shows loading + toast.
// Calls router.refresh() on success so the parent server component
// re-fetches and re-renders the affected list.
// =====================================================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  action: string;
  payload: Record<string, unknown>;
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  confirmMessage?: string;
}

export function AdminActionButton({
  action,
  payload,
  label,
  variant = 'outline',
  size = 'sm',
  confirmMessage,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setBusy(true);
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      toast.success(data.message ?? 'Done');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={busy}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label}
    </Button>
  );
}
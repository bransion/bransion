'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  reference: string;
}

const MAX_ATTEMPTS = 30; // 30 × 2s = 60 seconds
const INTERVAL_MS = 2000;

export function PendingPaymentPoller({ reference }: Props) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (gaveUp || attempts >= MAX_ATTEMPTS) {
      if (attempts >= MAX_ATTEMPTS) setGaveUp(true);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/paystack/verify-order?reference=${encodeURIComponent(reference)}`
        );
        const data = await res.json();

        if (data.status === 'paid') {
          router.refresh();
          return;
        }
        if (data.status === 'error' || data.status === 'not_found') {
          setAttempts(MAX_ATTEMPTS);
          setGaveUp(true);
          return;
        }
        setAttempts((a) => a + 1);
      } catch {
        setAttempts((a) => a + 1);
      }
    }, INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [attempts, gaveUp, reference, router]);

  if (gaveUp) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Still confirming. If you were charged, this may take up to 60 more seconds.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setAttempts(0);
            setGaveUp(false);
            router.refresh();
          }}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Check again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Auto-checking… (attempt {attempts + 1}/{MAX_ATTEMPTS})
    </div>
  );
}
// =====================================================================
// BRANSION — Once-per-session "Create a Brand" modal.
// Shows to logged-in users with tier = 'none'. Uses sessionStorage
// (per-tab) so it doesn't nag on every page navigation.
// Rule 1.9: soft pop-up with "Yes, let's go" / "Maybe later".
// =====================================================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SESSION_KEY = 'bransion_nudge_shown_v1';

interface Props {
  userTier: string | null;
}

export function CreateBrandNudge({ userTier }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (userTier !== 'none') return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // 1.5s delay so it doesn't compete with initial page paint.
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, 1500);

    return () => clearTimeout(t);
  }, [userTier]);

  function handleYes() {
    setOpen(false);
    router.push('/brands/new');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create your own Brand</DialogTitle>
          <DialogDescription>
            Upload a design, pick an apparel, set your markup, and start
            earning. Keep 70% of every sale.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
          <Button onClick={handleYes}>Yes, let&apos;s go</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminDeletePlainApparelV2 } from '@/app/actions/admin-inventory-v2';
import type { BasePlainApparel } from '../../../types';

interface Props {
  apparel: BasePlainApparel;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function DeleteApparelDialog({ apparel, open, onOpenChange }: Props) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const matches = typed.trim() === apparel.name.trim();

  async function handleDelete() {
    if (!matches) return;
    setBusy(true);
    const res = await adminDeletePlainApparelV2(apparel.id);
    setBusy(false);

    if (res.ok) {
      if (res.productsDeleted > 0) {
        toast.success(
          `Deleted. ${res.productsDeleted} product(s) removed, ${res.creatorsNotified} creator(s) notified.`
        );
      } else {
        toast.success('Apparel deleted');
      }
      setTyped('');
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) {
          onOpenChange(o);
          if (!o) setTyped('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete &quot;{apparel.name}&quot;?
          </DialogTitle>
          <DialogDescription>
            This will permanently delete this plain apparel AND every creator
            product built on it. All affected creators will receive a
            notification.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive space-y-1">
          <p className="font-semibold">This action cannot be undone:</p>
          <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
            <li>The plain apparel will be removed from Inventory</li>
            <li>All its styles will be deleted</li>
            <li>
              Every creator product built on this apparel will be automatically
              deleted from the store
            </li>
            <li>All affected creators will be notified</li>
            <li>
              Order history of past purchases is preserved (records remain)
            </li>
          </ul>
        </div>

        <div className="space-y-1.5 py-2">
          <Label>
            Type <strong>{apparel.name}</strong> to confirm
          </Label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={apparel.name}
            autoFocus
          />
          {typed && !matches && (
            <p className="text-xs text-destructive">Name does not match</p>
          )}
          {matches && (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Name matches
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!matches || busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
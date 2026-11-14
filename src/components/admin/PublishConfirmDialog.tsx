"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  compositeUrl: string;
  productName: string;
  creatorEmail: string | null;
  onConfirm: () => Promise<void>;
}

export function PublishConfirmDialog({
  open,
  onOpenChange,
  compositeUrl,
  productName,
  creatorEmail,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish &ldquo;{productName}&rdquo;?</DialogTitle>
          <DialogDescription>
            Publishing will make this product visible on the public Bransion
            store, and the creator will be notified immediately. The image will
            be locked from creator editing.
          </DialogDescription>
        </DialogHeader>

        <div className="aspect-square rounded-lg overflow-hidden bg-muted border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={compositeUrl}
            alt="Composite preview"
            className="w-full h-full object-contain"
          />
        </div>

        {creatorEmail && (
          <p className="text-xs text-muted-foreground text-center">
            Notification will be sent to <strong>{creatorEmail}</strong>
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy}
            className="bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white dark:from-white dark:to-gray-300 dark:text-[#0B0B0F]"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : (
              "Publish Live"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================================
// BRANSION — Reusable 3-step Delete Confirmation Dialog.
// No asChild props.
// =====================================================================
"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EntityType = "brand" | "product" | "account";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityName: string;
  onConfirm: () => Promise<void> | void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  entityType,
  entityName,
  onConfirm,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep(1);
    setTyped("");
    setBusy(false);
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      reset();
      onOpenChange(false);
    } catch {
      // Error is handled by the parent component's toast
      setBusy(false);
    }
  }

  const isMatch = typed === entityName;

  return (
    <Dialog
      open={open}
      onOpenChange={(o: boolean) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {step === 1 && `Delete ${entityType}?`}
            {step === 2 && "Type to confirm"}
            {step === 3 && "This is permanent"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && `Are you sure you want to delete "${entityName}"?`}
            {step === 2 &&
              `Please type "${entityName}" exactly as shown to confirm.`}
            {step === 3 && "This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {entityType === "brand" &&
              "Warning: All products inside this brand will also be deleted. This will free up 1 brand slot."}
            {entityType === "product" &&
              "Warning: If this product has any past orders, you will need to archive it instead to preserve financial history."}
            {entityType === "account" &&
              "Warning: This will delete your profile, brands, products, and wallet history. Any unpaid balances are forfeited."}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-1.5 py-2">
            <Label>Type "{entityName}"</Label>
            <Input
              value={typed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTyped(e.target.value)
              }
              placeholder={entityName}
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-center text-sm font-semibold text-destructive">
            Clicking "Delete Permanently" will immediately wipe this{" "}
            {entityType}.
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>

          {step === 1 && (
            <Button variant="destructive" onClick={() => setStep(2)}>
              Continue
            </Button>
          )}

          {step === 2 && (
            <Button
              variant="destructive"
              onClick={() => setStep(3)}
              disabled={!isMatch}
            >
              Continue
            </Button>
          )}

          {step === 3 && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Permanently"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { overrideUserTier } from "@/app/actions/admin-users-v3";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  userEmail: string;
  currentTier: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function TierOverrideDialog({
  userId,
  userEmail,
  currentTier,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState(currentTier || "basic");
  const [justification, setJustification] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (justification.length < 10)
      return toast.error("Justification must be at least 10 characters");

    setBusy(true);
    const res = await overrideUserTier({
      targetUserId: userId,
      newTier: tier,
      justification,
    });
    setBusy(false);

    if (res.ok) {
      toast.success("Tier updated successfully");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override User Tier</DialogTitle>
          <DialogDescription>
            Manually changing the tier for <strong>{userEmail}</strong>. This
            bypasses Paystack and is fully audited.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Select New Tier</Label>
            <div className="grid grid-cols-3 gap-2">
              {["basic", "standard", "premium"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={cn(
                    "py-2 rounded-md border text-sm font-medium capitalize",
                    tier === t
                      ? "bg-[#0B0B0F] text-white border-[#0B0B0F] dark:bg-white dark:text-[#0B0B0F]"
                      : "bg-background hover:bg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Administrative Justification *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="e.g. Refunded tier purchase due to system glitch..."
              rows={3}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              This will be saved in the audit log and sent to the user.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                busy || tier === currentTier || justification.length < 10
              }
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Override"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

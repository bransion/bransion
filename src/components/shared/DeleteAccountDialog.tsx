'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import {
  getDeletionPreview,
  deleteMyAccount,
  type DeletionPreview,
} from '@/app/actions/delete-account';
import { createClient } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function DeleteAccountDialog({ open, onOpenChange, userEmail }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [typedEmail, setTypedEmail] = useState('');
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [ack3, setAck3] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTypedEmail('');
      setAck1(false);
      setAck2(false);
      setAck3(false);
      setPreview(null);
      setLoadingPreview(true);
      getDeletionPreview()
        .then((data) => setPreview(data))
        .finally(() => setLoadingPreview(false));
    }
  }, [open]);

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteMyAccount();
    if (res.ok) {
      toast.success('Your account has been permanently deleted.');
      const supabase = createClient();
      await supabase.auth.signOut();
      onOpenChange(false);
      router.push('/sign-in');
      router.refresh();
        } else {
      setDeleting(false);
      toast.error(res.error, {
        duration: 10000,
        description: 'If this persists, email support@bransion.com.',
      });
    }
  }

  const emailMatches = typedEmail.trim().toLowerCase() === userEmail.toLowerCase();
  const allChecked = ack1 && ack2 && ack3;
  const canContinueStep2 = emailMatches && allChecked;

  return (
    <Dialog open={open} onOpenChange={(o) => !deleting && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Your Account?
              </DialogTitle>
              <DialogDescription>
                This action is permanent and cannot be undone. Please review what will be deleted.
              </DialogDescription>
            </DialogHeader>

            {loadingPreview ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {preview?.isSoleAdmin && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    <strong>You are the only admin.</strong> You cannot delete this account without first promoting another user to admin. Doing so would lock everyone out of admin access.
                  </div>
                )}

                <div className="rounded-lg border bg-destructive/5 p-4 space-y-2">
                  <p className="font-semibold text-destructive text-sm">
                    This will permanently delete:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Your profile and personal information</li>
                    <li><strong>{preview?.brandCount ?? 0}</strong> brand{(preview?.brandCount ?? 0) === 1 ? '' : 's'}</li>
                    <li><strong>{preview?.productCount ?? 0}</strong> product{(preview?.productCount ?? 0) === 1 ? '' : 's'}</li>
                    <li>Your wallet balance of <strong>{formatNaira(preview?.walletBalance ?? 0)}</strong></li>
                  </ul>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                  <p className="font-medium text-sm">Preserved but fully anonymized:</p>
                  <p className="text-xs text-muted-foreground">
                    {preview?.orderCount ?? 0} order{(preview?.orderCount ?? 0) === 1 ? '' : 's'} of purchase history — kept for financial recordkeeping, with all personal details removed. No one will be able to trace it back to you.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep(2)}
                disabled={loadingPreview || preview?.isSoleAdmin}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                This is your last chance to cancel. Type your email and check all boxes to prove you understand.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="confirm-email">
                  Type <strong>{userEmail}</strong> to confirm
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={typedEmail}
                  onChange={(e) => setTypedEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="off"
                />
                {typedEmail && !emailMatches && (
                  <p className="text-xs text-destructive">Email does not match</p>
                )}
                {emailMatches && (
                  <p className="text-xs text-green-600 dark:text-green-400">✓ Email matches</p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ack1}
                    onChange={(e) => setAck1(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="text-sm">
                    I understand my brands and products will be <strong>permanently deleted</strong>.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ack2}
                    onChange={(e) => setAck2(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="text-sm">
                    I understand my wallet balance will be <strong>forfeited</strong>.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ack3}
                    onChange={(e) => setAck3(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="text-sm">
                    I understand this action <strong>cannot be undone</strong>.
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)} disabled={deleting}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep(3)}
                disabled={!canContinueStep2}
              >
                I understand, continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                Final Confirmation
              </DialogTitle>
              <DialogDescription>
                Clicking the button below will permanently delete your account. You will be signed out immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-center space-y-2">
              <p className="text-sm font-semibold text-destructive">
                This is your final confirmation.
              </p>
              <p className="text-xs text-muted-foreground">
                Clicking &quot;Delete My Account Forever&quot; will immediately and irreversibly delete your account, brands, and products.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete My Account Forever'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
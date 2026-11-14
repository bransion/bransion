'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Trash2,
  LogIn,
  Loader2,
} from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  overrideTier,
  toggleRole,
  deleteUserAccount,
  startImpersonation,
} from '@/app/actions/admin-users';

export function UserActionsMenu({
  user,
}: {
  user: { id: string; email: string; role: string; account_tier: string };
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [tierOpen, setTierOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tier, setTier] = useState<'basic' | 'standard' | 'premium'>(
    (user.account_tier as any) || 'basic'
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState('');

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Portal needs to be mounted client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute menu position when opening
  useEffect(() => {
    if (menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // w-52 = 208px. Position menu right-aligned to button.
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right - 208,
      });
    }
  }, [menuOpen]);

  // Close on outside click OR scroll (menu uses fixed positioning)
  useEffect(() => {
    if (!menuOpen) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    function handleScrollOrResize() {
      setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [menuOpen]);

  async function handleTierSave() {
    setBusy(true);
    const res = await overrideTier(user.id, tier, reason);
    setBusy(false);
    if (res.ok) {
      toast.success('Tier updated successfully');
      setTierOpen(false);
      setReason('');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleToggleRole() {
    setMenuOpen(false);
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to ${newRole}?`)) return;
    if (!confirm('Are you absolutely sure?')) return;
    const res = await toggleRole(user.id, newRole);
    if (res.ok) {
      toast.success('Role updated');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleImpersonate() {
    setMenuOpen(false);
    const res = await startImpersonation(user.id);
    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete() {
    setBusy(true);
    const res = await deleteUserAccount(user.id);
    setBusy(false);
    if (res.ok) {
      toast.success('User deleted');
      setDeleteOpen(false);
      setStep(1);
      setTyped('');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="User actions"
        aria-expanded={menuOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Menu rendered via Portal — escapes ALL overflow containers */}
      {mounted &&
        menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              zIndex: 100,
            }}
            className="w-52 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
            role="menu"
          >
            <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
              User Actions
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setTierOpen(true);
              }}
              className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-muted"
            >
              <UserCog className="mr-2 h-4 w-4" /> Override Tier
            </button>
            <button
              type="button"
              onClick={handleToggleRole}
              className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-muted"
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Toggle Role
            </button>
            <button
              type="button"
              onClick={handleImpersonate}
              className="flex w-full items-center px-3 py-2 text-sm text-left hover:bg-muted"
            >
              <LogIn className="mr-2 h-4 w-4" /> Impersonate
            </button>
            <div className="border-t" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Account
            </button>
          </div>,
          document.body
        )}

      {/* Tier Override Modal */}
      <Dialog open={tierOpen} onOpenChange={setTierOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Tier</DialogTitle>
            <DialogDescription>
              Grant <strong>{user.email}</strong> any tier instantly. No payment required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Tier</Label>
              <Select value={tier} onValueChange={(v) => v && setTier(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic · 1 brand</SelectItem>
                  <SelectItem value="standard">Standard · 5 brands</SelectItem>
                  <SelectItem value="premium">Premium · Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Justification *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Complimentary partner upgrade"
              />
              <p className="text-[11px] text-muted-foreground">
                Logged in admin_audit_logs. User is notified automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleTierSave} disabled={busy || reason.trim().length < 3}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) {
            setStep(1);
            setTyped('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Delete Account
            </DialogTitle>
            <DialogDescription>
              {step === 1 && 'This will permanently delete the user and ALL their data.'}
              {step === 2 && `Type "${user.email}" to confirm.`}
              {step === 3 && 'This is permanent and cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {step === 2 && (
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={user.email}
              autoFocus
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
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
                disabled={typed !== user.email}
              >
                Continue
              </Button>
            )}
            {step === 3 && (
              <Button variant="destructive" onClick={handleDelete} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete permanently
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
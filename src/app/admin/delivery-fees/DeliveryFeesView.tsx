'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatNaira } from '@/lib/utils';
import { NIGERIAN_STATES } from '@/lib/nigeria-lgas';
import {
  upsertGeoShippingRate,
  deleteGeoShippingRate,
  type GeoShippingRate,
} from '@/app/actions/admin-delivery-fees';

interface Props {
  rates: GeoShippingRate[];
}

const STATE_OPTIONS = Object.keys(NIGERIAN_STATES).sort();

export function DeliveryFeesView({ rates }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<GeoShippingRate | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = rates.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.state.toLowerCase().includes(q) || r.lga.toLowerCase().includes(q);
  });

  const grouped = new Map<string, GeoShippingRate[]>();
  for (const r of filtered) {
    if (!grouped.has(r.state)) grouped.set(r.state, []);
    grouped.get(r.state)!.push(r);
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        'Delete this rate? Users in this LGA will fall back to the state default or ₦3,500 national default.'
      )
    ) {
      return;
    }
    setDeleting(id);
    const res = await deleteGeoShippingRate(id);
    setDeleting(null);
    if (res.ok) {
      toast.success('Rate deleted');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Delivery Fees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set per-LGA delivery fees. LGAs without a specific rate fall back to
            ₦3,500 (national default).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rate
        </Button>
      </div>

      <Input
        placeholder="Search by state or LGA..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search ? `No rates match "${search}".` : 'No delivery rates configured yet.'}
          </p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            Add your first rate
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([state, stateRates]) => (
            <div key={state} className="rounded-lg border bg-card">
              <div className="border-b p-4">
                <h2 className="font-semibold">{state}</h2>
                <p className="text-xs text-muted-foreground">
                  {stateRates.length} LGA{stateRates.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="divide-y">
                {stateRates.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.lga}</div>
                      {!r.is_active && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">
                      {formatNaira(r.fee)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                      >
                        {deleting === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <RateFormDialog
          rate={editing}
          open={true}
          onOpenChange={(o) => {
            if (!o) {
              setCreating(false);
              setEditing(null);
            }
          }}
        />
      )}
    </div>
  );
}

function RateFormDialog({
  rate,
  open,
  onOpenChange,
}: {
  rate: GeoShippingRate | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState(rate?.state ?? '');
  const [lga, setLga] = useState(rate?.lga ?? '');
  const [fee, setFee] = useState(rate?.fee?.toString() ?? '');
  const [isActive, setIsActive] = useState(rate?.is_active ?? true);

  const lgaOptions =
    state && NIGERIAN_STATES[state] ? NIGERIAN_STATES[state] : [];

  async function handleSave() {
    if (!state) return toast.error('Select a state');
    if (!lga.trim()) return toast.error('Select or enter an LGA');
    const feeNum = Number(fee);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      return toast.error('Enter a valid fee');
    }

    setBusy(true);
    const res = await upsertGeoShippingRate({
      id: rate?.id,
      state,
      lga: lga.trim(),
      fee: feeNum,
      is_active: isActive,
    });
    setBusy(false);

    if (res.ok) {
      toast.success(rate ? 'Rate updated' : 'Rate created');
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
          <DialogTitle>{rate ? 'Edit' : 'Add'} Delivery Rate</DialogTitle>
          <DialogDescription>
            Set the delivery fee for a specific LGA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select
              value={state}
              onValueChange={(v) => {
                if (v) {
                  setState(v);
                  setLga('');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {STATE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Local Government Area</Label>
            {lgaOptions.length > 0 ? (
              <Select value={lga} onValueChange={(v) => v && setLga(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select LGA" />
                </SelectTrigger>
                <SelectContent>
                  {lgaOptions.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder={state ? 'Type LGA name' : 'Select state first'}
                disabled={!state}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Fee (₦)</Label>
            <Input
              type="number"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="e.g. 2500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Rate is active
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {rate ? 'Save Changes' : 'Create Rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
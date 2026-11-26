'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadApparelImage } from '@/app/actions/admin-inventory';
import { adminUpdatePlainApparelV2 } from '@/app/actions/admin-inventory-v2';
import type { BasePlainApparel } from '../../../types';

const SIZES: string[] = [
  '2XS', 'XS', 'S', 'M', 'L', 'XL',
  '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL',
];

const CATEGORIES: string[] = [
  't-shirt', 'hoodie', 'sweatshirt', 'polo', 'cap', 'trouser', 'jacket',
  'shoes', 'sneakers', 'bag', 'shorts', 'tank-top', 'long-sleeve', 'joggers',
  'bucket-hat', 'beanie', 'socks', 'dress', 'skirt', 'suit',
];

interface Props {
  apparel: BasePlainApparel;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditPlainApparelDialog({ apparel, open, onOpenChange }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(apparel.name);
  const [category, setCategory] = useState(apparel.category as string);
  const [description, setDescription] = useState(apparel.description);
  const [baseCost, setBaseCost] = useState(String(apparel.default_base_cost));
  const [imageUrl, setImageUrl] = useState(apparel.main_image_url);
  const [isActive, setIsActive] = useState(apparel.is_active);

  const [sizes, setSizes] = useState<Record<string, number | null>>(() => {
    const existing =
      (apparel.size_price_modifiers as Record<string, number>) || {};
    const result: Record<string, number | null> = { M: 0 };
    for (const [k, v] of Object.entries(existing)) {
      if (k === 'M') continue;
      result[k] = Number(v);
    }
    return result;
  });

  // Standard sizes + any extras that exist in data
  const allSizes = SIZES.slice();
  for (const k of Object.keys(sizes)) {
    if (!allSizes.includes(k)) allSizes.push(k);
  }

  function toggleSize(size: string) {
    if (size === 'M') return;
    setSizes((prev) => {
      const next = { ...prev };
      if (next[size] === undefined || next[size] === null) next[size] = 0;
      else delete next[size];
      return next;
    });
  }

  function updateSizeMod(size: string, val: string) {
    const num = parseFloat(val) || 0;
    setSizes((prev) => ({ ...prev, [size]: num }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const okTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!okTypes.has(file.type)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return toast.error('Only JPEG, PNG, or WebP allowed');
    }
    if (file.size > 5_000_000) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return toast.error('Max 5 MB');
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = await uploadApparelImage(fd);
      setImageUrl(url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!name.trim() || name.trim().length < 2) {
      return toast.error('Name must be at least 2 characters');
    }
    const costNum = Number(baseCost);
    if (!Number.isFinite(costNum) || costNum <= 0) {
      return toast.error('Enter a valid base cost');
    }
    if (!imageUrl) return toast.error('Please upload an image');

    // Build size modifiers, M always 0
    const finalModifiers: Record<string, number> = { M: 0 };
    for (const [k, v] of Object.entries(sizes)) {
      if (v !== null && k !== 'M') finalModifiers[k] = v;
    }

    setBusy(true);
    const res = await adminUpdatePlainApparelV2(apparel.id, {
      name: name.trim(),
      category,
      description: description.trim(),
      main_image_url: imageUrl,
      default_base_cost: costNum,
      size_price_modifiers: finalModifiers,
      is_active: isActive,
    });
    setBusy(false);

    if (res.ok) {
      if (res.productsAffected > 0 && res.changesCount > 0) {
        toast.success(
          `Saved. ${res.productsAffected} product(s) updated + creators notified.`
        );
      } else if (res.productsAffected > 0) {
        toast.success(`Saved. ${res.productsAffected} product(s) recalced.`);
      } else {
        toast.success('Saved');
      }
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Plain Apparel</DialogTitle>
          <DialogDescription>
            Changes here cascade to ALL creator products using this apparel.
            Creators will be automatically notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              Editing this apparel will update every product built on it across
              all brands, recalculate their prices, and notify every affected
              creator.
            </p>
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Main Image</Label>
            <div className="flex items-center gap-3">
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-md border"
                />
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
                accept="image/jpeg,image/png,image/webp"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-3.5 w-3.5" />
                )}
                {imageUrl ? 'Change Image' : 'Upload Image'}
              </Button>
            </div>
          </div>

          {/* Name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c.replace('-', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Cloth Quality & Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Base cost */}
          <div className="space-y-1.5">
            <Label>Base &apos;M&apos; Cost (₦)</Label>
            <Input
              type="number"
              min="1"
              value={baseCost}
              onChange={(e) => setBaseCost(e.target.value)}
            />
          </div>

          {/* Sizes */}
          <div className="space-y-2">
            <Label>Size Availability & Price Modifiers (₦)</Label>
            <p className="text-xs text-muted-foreground">
              M is the base. Check the sizes you offer, then set how much extra
              (or less) each size costs compared to M.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allSizes.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 border p-2 rounded-md"
                >
                  <input
                    type="checkbox"
                    checked={sizes[s] !== undefined && sizes[s] !== null}
                    onChange={() => toggleSize(s)}
                    disabled={s === 'M'}
                    className="h-4 w-4"
                  />
                  <span className="font-medium w-10">{s}</span>
                  <Input
                    type="number"
                    value={sizes[s] ?? ''}
                    onChange={(e) => updateSizeMod(s, e.target.value)}
                    disabled={sizes[s] === undefined || sizes[s] === null || s === 'M'}
                    placeholder="0"
                    className="h-8 flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Apparel is active (visible in Create Product)
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
          <Button onClick={handleSave} disabled={busy || uploading}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
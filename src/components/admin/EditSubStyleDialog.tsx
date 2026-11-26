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
import { uploadStylePreview } from '@/app/actions/admin-inventory';
import { adminUpdateSubStyleV2 } from '@/app/actions/admin-inventory-v2';
import type { SubChildrenStyle } from '../../../types';

interface Props {
  style: SubChildrenStyle;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function EditSubStyleDialog({ style, open, onOpenChange }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(style.style_title);
  const [description, setDescription] = useState(
    style.style_description ?? ''
  );
  const [previewUrl, setPreviewUrl] = useState(style.preview_image_url);
  const [costMarkup, setCostMarkup] = useState(
    String(style.additional_cost_markup)
  );
  const [displayOrder, setDisplayOrder] = useState(
    String(style.display_order ?? 0)
  );
  const [isActive, setIsActive] = useState(style.is_active);

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
      const url = await uploadStylePreview(fd);
      setPreviewUrl(url);
      toast.success('Preview uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    if (!title.trim() || title.trim().length < 2) {
      return toast.error('Title must be at least 2 characters');
    }
    const costNum = Number(costMarkup);
    if (!Number.isFinite(costNum) || costNum < 0) {
      return toast.error('Enter a valid additional cost');
    }
    if (!previewUrl) return toast.error('Please upload a preview image');

    setBusy(true);
    const res = await adminUpdateSubStyleV2(style.id, {
      style_title: title.trim(),
      style_description: description.trim() || null,
      preview_image_url: previewUrl,
      additional_cost_markup: costNum,
      display_order: Number(displayOrder) || 0,
      is_active: isActive,
    });
    setBusy(false);

    if (res.ok) {
      if (res.productsAffected > 0 && res.changesCount > 0) {
        toast.success(
          `Saved. ${res.productsAffected} product(s) updated + creators notified.`
        );
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Style</DialogTitle>
          <DialogDescription>
            Changes here cascade to all creator products using this style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              Editing this style will recalculate prices for every product that
              uses it and notify every affected creator.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Preview Image</Label>
            <div className="flex items-center gap-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
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
                {previewUrl ? 'Change Image' : 'Upload Image'}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Style Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Additional Cost (₦)</Label>
              <Input
                type="number"
                min="0"
                value={costMarkup}
                onChange={(e) => setCostMarkup(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Style is active
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
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  adminUpdateBrand,
  adminUpdateProduct,
  adminUpdateBrandLogo,
  adminReplaceProductImage,
} from '@/app/actions/admin-catalog';
import type { CatalogBrand, CatalogProduct } from '@/app/actions/admin-catalog';

type Props =
  | { mode: 'brand'; entity: CatalogBrand; open: boolean; onOpenChange: (o: boolean) => void }
  | { mode: 'product'; entity: CatalogProduct; open: boolean; onOpenChange: (o: boolean) => void };

export function CatalogEditModal(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: props.entity.name,
    description: props.entity.description ?? '',
    phone: props.mode === 'brand' ? (props.entity as CatalogBrand).phone ?? '' : '',
    is_active: props.mode === 'brand' ? (props.entity as CatalogBrand).is_active : true,
    creator_markup: props.mode === 'product' ? String((props.entity as CatalogProduct).creator_markup) : '',
    image_url: props.mode === 'brand' ? (props.entity as CatalogBrand).logo_url ?? '' : (props.entity as CatalogProduct).design_url ?? '',
  });

  function upd<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const okTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!okTypes.has(file.type)) return toast.error('Only JPEG/PNG/WebP allowed');
    if (file.size > 5_000_000) return toast.error('Max 5MB');

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const bucket = props.mode === 'brand' ? 'brand-logos' : 'product-images';
      const path = `${props.entity.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      upd('image_url', data.publicUrl);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave() {
    setBusy(true);
    try {
      let res: { ok: boolean; error?: string };

      if (props.mode === 'brand') {
        // 1. Update brand text fields
        res = await adminUpdateBrand(props.entity.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          phone: form.phone.trim() || null,
          is_active: form.is_active,
        });
        if (!res.ok) throw new Error(res.error);

        // 2. Update brand logo if changed
        const currentLogo = (props.entity as CatalogBrand).logo_url || '';
        if (form.image_url !== currentLogo) {
          await adminUpdateBrandLogo(props.entity.id, form.image_url);
        }

      } else {
        // 1. Update product text fields
        res = await adminUpdateProduct(props.entity.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          creator_markup: Number(form.creator_markup),
        });
        if (!res.ok) throw new Error(res.error);

        // 2. Update product image if changed
        const currentImage = (props.entity as CatalogProduct).design_url || '';
        if (form.image_url !== currentImage) {
          await adminReplaceProductImage(props.entity.id, form.image_url);
        }
      }

      toast.success('Saved');
      props.onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {props.mode === 'brand' ? 'Brand' : 'Product'}</DialogTitle>
          <DialogDescription>Changes are audited and take effect immediately.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Upload Section */}
          <div className="space-y-1.5">
            <Label>{props.mode === 'brand' ? 'Brand Logo' : 'Product Image'}</Label>
            <div className="flex items-center gap-4">
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="h-16 w-16 rounded-md object-cover border" />
              )}
              
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
                disabled={uploading}
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {uploading ? 'Uploading...' : 'Upload New Image'}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => upd('name', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => upd('description', e.target.value)} />
          </div>

          {props.mode === 'brand' && (
            <>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => upd('phone', e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => upd('is_active', e.target.checked)} />
                Brand is active
              </label>
            </>
          )}

          {props.mode === 'product' && (
            <div className="space-y-1.5">
              <Label>Creator Markup (₦)</Label>
              <Input type="number" min={0} value={form.creator_markup} onChange={(e) => upd('creator_markup', e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || uploading}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
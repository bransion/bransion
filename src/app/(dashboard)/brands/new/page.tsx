// =====================================================================
// BRANSION — New brand form (client).
// SECURITY:
//   • Logo uploads to Supabase Storage `designs` bucket.
//   • Strict MIME: only image/jpeg, image/png, image/webp.
//   • Max 2 MB (logos are small).
//   • Filename uses crypto.randomUUID() under {userId}/brand-logo-*.
//   • Storage RLS enforces ownership; DB policy enforces MIME.
// =====================================================================
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 2_000_000; // 2 MB for logos

function getExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export default function NewBrandPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
  });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── 1) Client-side MIME + size pre-check ─────────────────────
    if (!ALLOWED_MIME.has(file.type)) {
      e.target.value = '';
      return toast.error('Only JPEG, PNG, or WebP images are allowed');
    }
    if (file.size > MAX_BYTES) {
      e.target.value = '';
      return toast.error('Logo must be under 2 MB');
    }

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // ── 2) UUID filename under user folder ────────────────────
      const filename = `brand-logo-${crypto.randomUUID()}.${getExt(file.type)}`;
      const path = `${user.id}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from('designs')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from('designs').getPublicUrl(path);
      setLogo(pub.publicUrl);
      toast.success('Logo uploaded');
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Logo upload failed'
      );
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      return toast.error('Brand name must be at least 2 characters');
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/brands/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          phone: form.phone,
          logo_url: logo ?? '',
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        issues?: Record<string, string[] | undefined>;
        redirect_url?: string;
        mode?: 'pending' | 'active';
      };

      if (!res.ok) {
        const firstIssue = data.issues
          ? Object.values(data.issues).flat().filter(Boolean)[0]
          : undefined;
        throw new Error(firstIssue ?? data.error ?? 'Brand creation failed');
      }

      toast.success(
        data.mode === 'pending'
          ? 'Brand created — complete tier purchase to activate'
          : 'Brand created!'
      );

      router.push(data.redirect_url ?? '/brands');
    } catch (err) {
      setSubmitting(false);
      toast.error(
        err instanceof Error ? err.message : 'Failed to create brand'
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create a Brand</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your brand identity. You can edit these details anytime.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border bg-card p-6"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Brand Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Lagos Vibes"
            maxLength={60}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="What makes your brand unique?"
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (for customer contact)</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+234..."
          />
        </div>

        {/* ── Logo dropzone ──────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>Brand Logo</Label>
          {logo ? (
            <div className="relative rounded-lg border bg-muted/30 p-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt="Logo preview"
                className="h-16 w-16 rounded object-cover"
              />
              <p className="text-sm text-muted-foreground flex-1">
                Logo uploaded. Looks good!
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLogo(null)}
                aria-label="Remove logo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                id="logo-input"
                className="hidden"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
              />
              <label
                htmlFor="logo-input"
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm">Uploading logo…</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload logo</p>
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP · max 2 MB
                    </p>
                  </>
                )}
              </label>
              <p className="text-xs text-muted-foreground text-center pt-1">
                I don&apos;t have a logo or design, skip
              </p>
            </>
          )}
        </div>

        <div className="rounded-md bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Heads up:</strong> if you don&apos;t
          have a tier yet, we&apos;ll save your brand as a draft and take you to
          the subscription page. It activates once payment is confirmed.
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || uploadingLogo}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating brand…
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </form>
    </div>
  );
}
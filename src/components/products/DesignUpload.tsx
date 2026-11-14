// =====================================================================
// BRANSION — Design upload (client). Two modes:
//   purpose='design'    → JPEG/PNG/WebP, 5MB,  bucket=designs
//   purpose='raw_asset' → PNG/SVG/PDF,    20MB, bucket=brand-assets
// PNG/SVG/PDF for raw assets = vector-safe handoff to admin compositing.
// =====================================================================
'use client';

import { useState } from 'react';
import { ImageIcon, Loader2, X, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface Props {
  value: string;
  onChange: (url: string) => void;
  purpose?: 'design' | 'raw_asset';
}

const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT ?? '';

const CONFIG = {
  design: {
    bucket: 'designs',
    pathPrefix: (uid: string) => uid,
    allowedMimes: new Set(['image/jpeg', 'image/png', 'image/webp']),
    maxBytes: 5_000_000,
    accept: 'image/jpeg,image/png,image/webp',
    label: 'JPEG, PNG, or WebP',
    maxLabel: '5 MB',
  },
  raw_asset: {
    bucket: 'brand-assets',
    pathPrefix: (uid: string) => `raw/${uid}`,
    allowedMimes: new Set([
      'image/png',
      'image/svg+xml',
      'application/pdf',
    ]),
    maxBytes: 20_000_000,
    accept: 'image/png,image/svg+xml,application/pdf',
    label: 'PNG, SVG, or PDF',
    maxLabel: '20 MB',
  },
};

function extFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'application/pdf') return 'pdf';
  return 'bin';
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

export function DesignUpload({ value, onChange, purpose = 'design' }: Props) {
  const [uploading, setUploading] = useState(false);
  const cfg = CONFIG[purpose];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cfg.allowedMimes.has(file.type)) {
      e.target.value = '';
      return toast.error(`Only ${cfg.label} files are allowed`);
    }
    if (file.size > cfg.maxBytes) {
      e.target.value = '';
      return toast.error(`File must be under ${cfg.maxLabel}`);
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const filename = `${crypto.randomUUID()}.${extFor(file.type)}`;
      const path = `${cfg.pathPrefix(user.id)}/${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from(cfg.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage
        .from(cfg.bucket)
        .getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success('File uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : `Upload failed. Did you create the "${cfg.bucket}" bucket?`
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <section className="rounded-lg border bg-card p-6 space-y-3">
      <div>
        <h2 className="font-semibold">
          {purpose === 'raw_asset' ? '3. Upload your design asset' : '3. Upload your design'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {cfg.label} · max {cfg.maxLabel}.
          {purpose === 'raw_asset' &&
            ' Vector formats give the sharpest final print.'}
        </p>
      </div>

      {value ? (
        <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-4">
          {isPdf(value) ? (
            <div className="h-20 w-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Design preview"
              className="h-20 w-20 rounded object-cover flex-shrink-0 bg-white"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {isPdf(value) ? 'PDF uploaded' : 'Design uploaded'}
            </p>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline inline-flex items-center gap-1 mt-1 text-muted-foreground hover:text-foreground"
            >
              Preview in new tab <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange('')}
            aria-label="Remove design"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <input
            type="file"
            accept={cfg.accept}
            id={`design-upload-${purpose}`}
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
          <label
            htmlFor={`design-upload-${purpose}`}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-muted/30 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm">Uploading…</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Click to upload {purpose === 'raw_asset' ? 'your design' : 'design'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cfg.label} · max {cfg.maxLabel}
                </span>
              </>
            )}
          </label>
        </>
      )}

      {WHATSAPP && (
        <a
          href={`https://wa.me/${WHATSAPP.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-muted-foreground hover:text-foreground text-center underline pt-1"
        >
          I don&apos;t have a Brand design — create one for me on WhatsApp
        </a>
      )}
    </section>
  );
}
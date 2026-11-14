'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, CheckCircle2, Maximize2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { publishV3ProductWithEdits } from '@/app/actions/admin-synthesis';
import { createClient } from '@/lib/supabase/client';
import { formatNaira } from '@/lib/utils';

export function SynthesisReviewModal({
  product,
  open,
  onOpenChange,
}: {
  product: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enlargeOpen, setEnlargeOpen] = useState(false);

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || '');
  const [markup, setMarkup] = useState(String(product.user_profit_markup));
  const [compositeUrl, setCompositeUrl] = useState('');

  const baseCost = Number(product.base_cost_calculated || 0);
  const markupNum = Number(markup) || 0;
  const totalRetail = baseCost + markupNum;

  // Defensive extraction — handles object OR array form
  const style = Array.isArray(product.sub_children_styles)
    ? product.sub_children_styles[0]
    : product.sub_children_styles;
  const styleTitle = style?.style_title || 'Unknown Style';
  const stylePreviewUrl = style?.preview_image_url || '';

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `composites/${product.id}-${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;

      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setCompositeUrl(data.publicUrl);
      toast.success('Mockup uploaded');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handlePublish() {
    if (!compositeUrl) return toast.error('Please upload a composite mockup first');
    if (!name || !description) return toast.error('Name and description are required');

    setBusy(true);
    const res = await publishV3ProductWithEdits(product.id, {
      name,
      description,
      markup: markupNum,
      compositeUrl,
    });
    setBusy(false);

    if (res.ok) {
      toast.success('Product published successfully');
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Publish Product</DialogTitle>
            <DialogDescription>
              Fix any typos, upload the final mockup, and preview before publishing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Left Side */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Product Title</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Profit Markup (₦)</Label>
                <Input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} />
              </div>

              {/* STYLE REFERENCE BLOCK */}
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <Label className="text-sm font-semibold">Selected Style Reference</Label>
                {stylePreviewUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-md overflow-hidden border bg-muted flex-shrink-0">
                      <img
                        src={stylePreviewUrl}
                        alt={styleTitle}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://placehold.co/100x100/0B0B0F/E5E5EA?text=No+Preview';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{styleTitle}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEnlargeOpen(true)}
                        >
                          <Maximize2 className="h-3.5 w-3.5 mr-1.5" /> Enlarge
                        </Button>
                        <a
                          href={stylePreviewUrl}
                          download={`style-${styleTitle.replace(/\s+/g, '-')}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button type="button" size="sm" variant="outline">
                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-[10px] text-center p-1">
                      No image
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{styleTitle}</p>
                      <p className="text-xs">This style has no preview image.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t mt-4">
                <Label className="text-base font-semibold mb-2 block">Upload Composite Image</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleUpload}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {compositeUrl ? 'Change Image' : 'Select Image from Device'}
                </Button>
              </div>
            </div>

            {/* Right Side Preview */}
            <div className="space-y-3 bg-muted/20 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
                Live Preview
              </h4>
              <div className="aspect-square bg-muted rounded-md overflow-hidden relative shadow-sm">
                {compositeUrl ? (
                  <img src={compositeUrl} alt="Composite" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    Awaiting Image Upload
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-lg">{name || 'Product Title'}</div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description || 'Product description...'}
                </div>
                <div className="text-xl font-bold mt-3">{formatNaira(totalRetail)}</div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={busy || uploading || !compositeUrl}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Publish to Store
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enlarged Style Preview */}
      <Dialog open={enlargeOpen} onOpenChange={setEnlargeOpen}>
        <DialogContent className="max-w-3xl border-0 bg-transparent shadow-none p-0">
          <div className="relative bg-background rounded-lg overflow-hidden border shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between p-4 border-b bg-muted/30">
              <span className="font-semibold text-sm">{styleTitle}</span>
              <a
                href={stylePreviewUrl}
                download={`style-${styleTitle.replace(/\s+/g, '-')}.jpg`}
                target="_blank"
                rel="noreferrer"
              >
                <Button type="button" size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </a>
            </div>
            <div className="w-full max-h-[75vh] overflow-auto bg-muted flex items-center justify-center p-4">
              <img
                src={stylePreviewUrl}
                alt={styleTitle}
                className="max-w-full max-h-[70vh] object-contain rounded-md"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
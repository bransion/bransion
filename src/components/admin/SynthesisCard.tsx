'use client';

import { useState } from 'react';
import { Download, CheckCircle2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import { SynthesisReviewModal } from './SynthesisReviewModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SynthesisCard({ product }: { product: any }) {
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const styleTitle = product.sub_children_styles?.style_title || 'Unknown Style';
  const stylePreviewUrl = product.sub_children_styles?.preview_image_url || '';

  return (
    <>
      <div className="rounded-lg border bg-card p-4 space-y-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">{product.brands?.name}</span>
            <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">
              Pending Review
            </span>
          </div>
          <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>

          {/* Style preview thumbnail — this is what was missing */}
          <div className="mt-3 rounded-md border bg-muted/30 p-2 flex items-center gap-3">
            {stylePreviewUrl ? (
              <button
                type="button"
                onClick={() => setImagePreview(stylePreviewUrl)}
                className="h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0 border relative group"
              >
                <img
                  src={stylePreviewUrl}
                  alt={styleTitle}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://placehold.co/100x100/0B0B0F/E5E5EA?text=No+Preview';
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </button>
            ) : (
              <div className="h-14 w-14 rounded-md bg-muted flex-shrink-0 flex items-center justify-center text-[10px] text-muted-foreground text-center leading-tight p-1">
                No style image
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                Style
              </div>
              <div className="text-sm font-medium truncate">{styleTitle}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm border-t pt-3">
            <div className="text-muted-foreground">Apparel:</div>
            <div className="font-medium text-right truncate">{product.base_plain_apparel?.name}</div>
            <div className="text-muted-foreground">Retail Price:</div>
            <div className="font-medium text-right text-green-600 dark:text-green-400">
              {formatNaira(product.total_retail_price)}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <a href={product.raw_creator_artwork_url} target="_blank" rel="noreferrer" className="block">
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" /> Download Raw Asset
            </Button>
          </a>

          <Button
            className="w-full bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F]"
            onClick={() => setOpen(true)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Review & Publish
          </Button>
        </div>
      </div>

      {/* Enlarge Style Image Modal */}
      <Dialog open={!!imagePreview} onOpenChange={(o) => !o && setImagePreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Style Preview: {styleTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-md p-4">
            {imagePreview && (
              <img
                src={imagePreview}
                alt={styleTitle}
                className="max-w-full max-h-[70vh] object-contain rounded-md"
              />
            )}
          </div>
          <div className="flex justify-end">
            <a href={imagePreview || '#'} download={`style-${styleTitle.replace(/\s+/g, '-')}.jpg`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Download Style Image
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      <SynthesisReviewModal product={product} open={open} onOpenChange={setOpen} />
    </>
  );
}
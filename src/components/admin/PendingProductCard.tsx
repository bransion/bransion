"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Copy,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PublishConfirmDialog } from "./PublishConfirmDialog";
import {
  getProductRawAssetSignedUrl,
  publishProduct,
  rejectProduct,
  uploadFinalComposite,
} from "@/app/actions/admin-fulfillment-v3";
import type { FulfillmentProduct } from "../../../types";
import { formatNaira } from "@/lib/utils";

interface Props {
  product: FulfillmentProduct;
}

export function PendingProductCard({ product }: Props) {
  const router = useRouter();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const url = await getProductRawAssetSignedUrl(product.id);
        setSignedUrl(url);
      } catch (err) {
        console.error("Signed URL error:", err);
      } finally {
        setLoadingUrl(false);
      }
    })();
  }, [product.id]);

  async function handleDownload() {
    if (!signedUrl) return;
    window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleCopyConfig() {
    const config = {
      apparel: product.apparel_name,
      category: product.apparel_category,
      style: product.style_title,
      placement: product.style_description,
      quality: product.apparel_description,
      markup: product.user_profit_markup,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast.success("Style config copied");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFinalComposite(file);
      setCompositeUrl(url);
      toast.success("Composite uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handlePublish() {
    if (!compositeUrl) return;
    const res = await publishProduct(product.id, compositeUrl);
    if (res.ok) {
      toast.success("Product published live!");
      setPublishOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
      throw new Error(res.error);
    }
  }

  async function handleReject() {
    if (rejectReason.trim().length < 5) {
      return toast.error("Provide a reason (min 5 chars)");
    }
    setRejecting(true);
    const res = await rejectProduct(product.id, rejectReason.trim());
    setRejecting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Product rejected");
    setRejectOpen(false);
    setRejectReason("");
    router.refresh();
  }

  return (
    <>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT — raw asset preview */}
        <div className="lg:w-1/2 aspect-square lg:aspect-auto bg-muted relative">
          {loadingUrl ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain p-4"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No raw asset
            </div>
          )}
        </div>

        {/* RIGHT — info + actions */}
        <div className="lg:w-1/2 p-5 space-y-4">
          <div>
            <div className="text-xs text-muted-foreground">
              {product.brand_name} · {product.creator_email}
            </div>
            <h3 className="font-bold text-lg">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          {/* Apparel + Style block */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-muted/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                Apparel
              </div>
              <div className="text-xs font-medium truncate">
                {product.apparel_name}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {product.apparel_category}
              </div>
              {product.apparel_image_url && (
                <a
                  href={product.apparel_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] underline inline-flex items-center gap-1 mt-1 text-muted-foreground hover:text-foreground"
                >
                  Preview <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <div className="rounded-md border bg-muted/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                Style
              </div>
              <div className="text-xs font-medium truncate">
                {product.style_title}
              </div>
              <div className="text-[10px] text-muted-foreground">
                +{formatNaira(product.style_cost)}
              </div>
              {product.style_preview_url && (
                <a
                  href={product.style_preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] underline inline-flex items-center gap-1 mt-1 text-muted-foreground hover:text-foreground"
                >
                  Preview <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>

          {product.apparel_description && (
            <div className="rounded-md border bg-muted/30 p-2">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">
                Quality spec
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {product.apparel_description}
              </p>
            </div>
          )}

          {/* Financials */}
          <div className="rounded-md bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost Price</span>
              <span>{formatNaira(product.base_cost_calculated)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Added Profit</span>
              <span>{formatNaira(product.user_profit_markup)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total Retail</span>
              <span>{formatNaira(product.total_retail_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bransion Fee</span>
              <span>{formatNaira(product.bransion_commission_fee)}</span>
            </div>
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Creator Net</span>
              <span className="font-medium">
                {formatNaira(product.creator_net_payout)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!signedUrl}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Raw asset
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Style config
              </Button>
            </div>

            {/* Composite upload */}
            <div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                id={`composite-${product.id}`}
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
              <label htmlFor={`composite-${product.id}`}>
                <Button
                  variant={compositeUrl ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  disabled={uploading}
                  type="button"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </>
                  ) : compositeUrl ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                      Composite uploaded (change)
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Upload composite image
                    </>
                  )}
                </Button>
              </label>
            </div>

            {compositeUrl && (
              <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compositeUrl}
                  alt="Composite preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => setPublishOpen(true)}
                disabled={!compositeUrl}
                className="bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white dark:from-white dark:to-gray-300 dark:text-[#0B0B0F]"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Publish confirm */}
      {compositeUrl && (
        <PublishConfirmDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          compositeUrl={compositeUrl}
          productName={product.name}
          creatorEmail={product.creator_email}
          onConfirm={handlePublish}
        />
      )}

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject &ldquo;{product.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              The creator will see this reason on their dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`reject-${product.id}`}>Reason *</Label>
            <Input
              id={`reject-${product.id}`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Design is low resolution"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting}
            >
              {rejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

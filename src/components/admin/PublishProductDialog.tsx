// =====================================================================
// BRANSION — Publish product dialog (client).
// Admin uploads composite image → publishProduct() server action.
// =====================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publishProduct } from "@/app/actions/admin-fulfillment";

interface Props {
  productId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 10_000_000;

function extFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export function PublishProductDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED.has(f.type)) {
      e.target.value = "";
      return toast.error("Only JPEG, PNG, or WebP are allowed");
    }
    if (f.size > MAX) {
      e.target.value = "";
      return toast.error("Image must be under 10 MB");
    }
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleConfirm() {
    if (!file) return toast.error("Upload a composite image first");
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${productId}/${crypto.randomUUID()}.${extFor(file.type)}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      const result = await publishProduct(productId, pub.publicUrl);
      if (!result.ok) throw new Error(result.error);

      toast.success("Product published");
      onOpenChange(false);
      setFile(null);
      setPreview(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish &quot;{productName}&quot;</DialogTitle>
          <DialogDescription>
            Upload the final composite image. This becomes the product image
            shown on the storefront.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Composite preview"
              className="w-full max-h-72 object-contain rounded-md border bg-muted/30"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              disabled={uploading}
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Choose different image
            </Button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              id="composite-upload"
              className="hidden"
              onChange={handleFile}
            />
            <label
              htmlFor="composite-upload"
              className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-10 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                Click to upload composite
              </span>
              <span className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP · max 10 MB
              </span>
            </label>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing…
              </>
            ) : (
              "Publish now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

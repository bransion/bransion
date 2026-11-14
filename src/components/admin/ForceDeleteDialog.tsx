// =====================================================================
// BRANSION — Force delete / replace-image dialog.
// 3-step confirmation + product image replacement alternative.
// No asChild prop on Button.
// =====================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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
import {
  adminForceDeleteBrand,
  adminForceDeleteProduct,
  adminReplaceProductImage,
} from "@/app/actions/admin-catalog";
import type { CatalogBrand, CatalogProduct } from "@/app/actions/admin-catalog";

type Props =
  | {
      mode: "brand";
      entity: CatalogBrand;
      open: boolean;
      onOpenChange: (o: boolean) => void;
    }
  | {
      mode: "product";
      entity: CatalogProduct;
      open: boolean;
      onOpenChange: (o: boolean) => void;
    };

export function ForceDeleteDialog(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState(false);

  function reset() {
    setStep(1);
    setTyped("");
    setBusy(false);
  }

  async function handleDelete() {
    setBusy(true);
    try {
      if (props.mode === "brand") {
        const res = await adminForceDeleteBrand(props.entity.id);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Permanently deleted");
      } else {
        const res = await adminForceDeleteProduct(props.entity.id);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        if (res.archived) {
          toast.success("Product archived (order history preserved)");
        } else {
          toast.success("Permanently deleted");
        }
      }
      reset();
      props.onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReplaceImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (props.mode !== "product") return;
    const file = e.target.files?.[0];
    if (!file) return;
    const okTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!okTypes.has(file.type)) {
      e.target.value = "";
      return toast.error("Only JPEG/PNG/WebP");
    }
    if (file.size > 10_000_000) {
      e.target.value = "";
      return toast.error("Max 10 MB");
    }
    setReplacing(true);
    try {
      const supabase = createClient();
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";
      const path = `${props.entity.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      const res = await adminReplaceProductImage(
        props.entity.id,
        data.publicUrl,
      );
      if (!res.ok) throw new Error(res.error);
      toast.success("Image replaced");
      reset();
      props.onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setReplacing(false);
      e.target.value = "";
    }
  }

  const canAdvanceStep2 = typed === props.entity.name;

  return (
    <Dialog
      open={props.open}
      onOpenChange={(o) => {
        if (!o) reset();
        props.onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {step === 1 && "Are you sure?"}
            {step === 2 && "Type the name to confirm"}
            {step === 3 && "This is permanent"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 &&
              `You are about to ${props.mode === "brand" ? "delete a brand" : "delete a product"} named "${props.entity.name}".`}
            {step === 2 &&
              `Type "${props.entity.name}" exactly to confirm the action.`}
            {step === 3 &&
              "This action cannot be undone. Any associated audit log entry is permanent."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {props.mode === "brand"
                ? "All products in this brand will be deleted. If any of them has order history, the delete will be blocked and you can archive instead."
                : "If this product has order history, it will be archived instead of deleted to preserve financial records."}
            </p>

            {props.mode === "product" && (
              <div className="rounded-md border bg-muted/30 p-3">
                <Label className="text-xs">
                  Replace image instead of deleting?
                </Label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Keep the product live, just swap the composite image.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  id="replace-image-input"
                  className="hidden"
                  onChange={handleReplaceImage}
                  disabled={replacing}
                />
                <label htmlFor="replace-image-input">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={replacing}
                  >
                    {replacing ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        Upload replacement image
                      </>
                    )}
                  </Button>
                </label>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-1.5">
            <Label>Confirmation</Label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={props.entity.name}
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Clicking &quot;Delete permanently&quot; will{" "}
            {props.mode === "brand"
              ? "delete the brand and its products"
              : "delete the product"}{" "}
            immediately.
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => props.onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          {step === 1 && (
            <Button variant="destructive" onClick={() => setStep(2)}>
              Continue
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="destructive"
              onClick={() => setStep(3)}
              disabled={!canAdvanceStep2}
            >
              Continue
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete permanently"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

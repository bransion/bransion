"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubStyle,
  uploadStylePreview,
} from "@/app/actions/admin-inventory";

export function SubStyleForm({
  apparelId,
  open,
  onOpenChange,
}: {
  apparelId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const url = await uploadStylePreview(fd);
      setPreviewUrl(url);
      toast.success("Preview uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !cost || !previewUrl)
      return toast.error("Fill all required fields");

    const fd = new FormData();
    fd.append("plain_apparel_id", apparelId);
    fd.append("style_title", title);
    fd.append("style_description", desc);
    fd.append("preview_image_url", previewUrl);
    fd.append("additional_cost_markup", cost);

    setBusy(true);
    const res = await createSubStyle(fd);
    setBusy(false);

    if (res.ok) {
      toast.success("Sub-style added");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Sub-Style</DialogTitle>
          <DialogDescription>
            Define a print placement for this garment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Style Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Back Print"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description (Optional)</Label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Additional Cost (₦)</Label>
              <Input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="2000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preview Image</Label>
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-10 w-10 object-cover rounded"
                  />
                )}
                <input
                  type="file"
                  id="style-img"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                  accept="image/*"
                />
                <label htmlFor="style-img">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}{" "}
                    Upload
                  </Button>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add Sub-Style"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

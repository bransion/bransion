"use client";

import { useState, useRef } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPlainApparel,
  uploadApparelImage,
} from "@/app/actions/admin-inventory";
import { formatNaira } from "@/lib/utils";

const SIZES = [
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
  "9XL",
  "10XL",
];

export function PlainApparelForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("t-shirt");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");

  // size -> modifier (null means unchecked)
  const [sizes, setSizes] = useState<Record<string, number | null>>({ M: 0 });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const url = await uploadApparelImage(fd);
      setMainImageUrl(url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function toggleSize(size: string) {
    if (size === "M") return;
    setSizes((prev) => {
      const next = { ...prev };
      if (next[size] === undefined || next[size] === null) next[size] = 0;
      else delete next[size];
      return next;
    });
  }

  function updateSizeMod(size: string, val: string) {
    const num = parseFloat(val) || 0;
    setSizes((prev) => ({ ...prev, [size]: num }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !description || !basePrice || !mainImageUrl)
      return toast.error("Please fill all fields and upload an image");

    // Build the modifiers object, ensuring M is always 0
    const finalModifiers: Record<string, number> = { M: 0 };
    Object.entries(sizes).forEach(([k, v]) => {
      if (v !== null && k !== "M") finalModifiers[k] = v;
    });

    const fd = new FormData();
    fd.append("name", name);
    fd.append("category", category);
    fd.append("description", description);
    fd.append("default_base_cost", basePrice);
    fd.append("main_image_url", mainImageUrl);
    fd.append("size_price_modifiers", JSON.stringify(finalModifiers));

    setBusy(true);
    const res = await createPlainApparel(fd);
    setBusy(false);

    if (res.ok) {
      toast.success("Plain apparel created");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Plain Apparel</DialogTitle>
          <DialogDescription>
            Create a base garment that creators can design on.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Premium Hoodie"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => v && setCategory(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "t-shirt",
                    "hoodie",
                    "sweatshirt",
                    "polo",
                    "cap",
                    "trouser",
                    "jacket",
                  ].map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cloth Quality & Description (Visible to Creators & Buyers)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="e.g. 100% combed cotton, heavyweight 180g. Premium quality." required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Base 'M' Price (₦)</Label>
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="10000"
                required
              />
            </div>
              <div className="space-y-1.5">
              <Label>Main Image</Label>
              <div className="flex items-center gap-3">
                {mainImageUrl && <img src={mainImageUrl} alt="Preview" className="h-10 w-10 object-cover rounded" />}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                  accept="image/*"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Size Availability & Price Modifiers (₦)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              M is the base. Positive modifiers add cost, negative subtract.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 border p-2 rounded-md"
                >
                  <input
                    type="checkbox"
                    checked={sizes[s] !== undefined}
                    onChange={() => toggleSize(s)}
                    disabled={s === "M"}
                    className="h-4 w-4"
                  />
                  <span className="font-medium w-8">{s}</span>
                  <Input
                    type="number"
                    value={sizes[s] ?? ""}
                    onChange={(e) => updateSizeMod(s, e.target.value)}
                    disabled={sizes[s] === undefined || s === "M"}
                    placeholder="0"
                    className="h-8 flex-1"
                  />
                </div>
              ))}
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
                "Create Plain Apparel"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

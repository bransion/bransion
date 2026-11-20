"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Archive, RotateCcw, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteProduct } from "@/app/actions/creator-deletion";
import { formatNaira } from "@/lib/utils";
import Image from "next/image";

export interface ProductRowData {
  id: string;
  name: string;
  slug: string;
  design_url: string | null;
  creator_markup: number;
  status: string; // Accepts both V2 and V3 statuses
  rejection_reason?: string | null;
  brand_name: string | null;
  brand_slug: string | null;
}

interface Props {
  product: ProductRowData;
}

export function ProductRow({ product }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function setStatus(next: "live" | "archived") {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(
        next === "archived" ? "Product archived" : "Product republished",
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const res = await deleteProduct(product.id);
    if (res.ok) {
      toast.success("Product deleted");
      router.refresh();
    } else {
      toast.error(res.error);
      throw new Error(res.error);
    }
  }

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
        {/* Product */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded bg-muted overflow-hidden flex-shrink-0 relative">
              {product.design_url ? (
                <Image
                  src={product.design_url}
                  alt={product.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{product.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {product.brand_name ?? "—"} · /{product.slug}
              </div>
            </div>
          </div>
        </td>

        {/* Markup */}
        <td className="py-3 px-4 text-sm whitespace-nowrap">
          {formatNaira(Number(product.creator_markup))}
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          <StatusBadge status={product.status} />
          {product.rejection_reason && (
            <div className="text-[10px] text-destructive mt-1 max-w-[150px] truncate">
              {product.rejection_reason}
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="py-3 px-4">
          <div className="flex justify-end gap-2">
            <Link href={`/products/${product.id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>

            {product.status === "live" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStatus("archived")}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                  </>
                )}
              </Button>
            )}

            {product.status === "archived" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStatus("live")}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Republish
                  </>
                )}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityType="product"
        entityName={product.name}
        onConfirm={handleDelete}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-green-500/10 text-green-700 dark:text-green-400",
    live: "bg-green-500/10 text-green-700 dark:text-green-400",
    pending_review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    draft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    rejected: "bg-destructive/10 text-destructive",
    archived: "bg-muted text-muted-foreground",
  };

  const labels: Record<string, string> = {
    published: "Live",
    pending_review: "Pending Review",
    rejected: "Rejected",
  };

  return (
    <span
      className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${styles[status] || styles.archived}`}
    >
      {labels[status] || status}
    </span>
  );
}

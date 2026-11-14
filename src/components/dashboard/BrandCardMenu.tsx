// =====================================================================
// BRANSION — Brand card actions menu.
// =====================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { deleteBrand } from "@/app/actions/creator-deletion";
import { toast } from "sonner";

export function BrandCardMenu({
  brandId,
  brandName,
}: {
  brandId: string;
  brandName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const res = await deleteBrand(brandId);
    if (res.ok) {
      toast.success("Brand deleted");
      router.refresh();
    } else {
      toast.error(res.error);
      throw new Error(res.error);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-background/50 backdrop-blur"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="cursor-pointer text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete Brand
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={open}
        onOpenChange={setOpen}
        entityType="brand"
        entityName={brandName}
        onConfirm={handleDelete}
      />
    </>
  );
}

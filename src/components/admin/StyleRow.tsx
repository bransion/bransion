// src/components/admin/StyleRow.tsx
"use client";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { archiveSubStyle } from "@/app/actions/admin-inventory";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { SubChildrenStyle } from "../../../types";

export function StyleRow({ style }: { style: SubChildrenStyle }) {
  const router = useRouter();

  async function handleArchive() {
    if (!confirm("Archive this style?")) return;
    const res = await archiveSubStyle(style.id);
    if (res.ok) {
      toast.success("Archived");
      router.refresh();
    } else toast.error(res.error);
  }

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0 bg-background/50">
      <div className="flex items-center gap-3">
        <img
          src={style.preview_image_url}
          alt={style.style_title}
          className="h-10 w-10 object-cover rounded border"
        />
        <div>
          <div className="font-medium text-sm">{style.style_title}</div>
          <div className="text-xs text-muted-foreground">
            +{formatNaira(style.additional_cost_markup)} cost
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleArchive}
        className="text-destructive h-8 w-8"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

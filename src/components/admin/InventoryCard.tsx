// src/components/admin/InventoryCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { Package, Archive } from "lucide-react";
import { archivePlainApparel } from "@/app/actions/admin-inventory";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function InventoryCard({
  apparel,
  onManage,
}: {
  apparel: any;
  onManage: () => void;
}) {
  const router = useRouter();

  async function handleArchive() {
    if (
      !confirm(
        "Archive this apparel? It will no longer be available to creators.",
      )
    )
      return;
    const res = await archivePlainApparel(apparel.id);
    if (res.ok) {
      toast.success("Archived");
      router.refresh();
    } else toast.error(res.error);
  }

  const styleCount = apparel.sub_children_styles?.[0]?.count ?? 0;

  return (
    <Card className={!apparel.is_active ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-4">
        <div className="aspect-square rounded-md overflow-hidden bg-muted relative">
          <img
            src={apparel.main_image_url}
            alt={apparel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur text-xs font-semibold px-2 py-1 rounded">
            {apparel.category}
          </div>
        </div>
        <div>
          <h3 className="font-semibold truncate">{apparel.name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatNaira(apparel.default_base_cost)} base
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {styleCount} styles attached
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="outline" onClick={onManage}>
            Manage Styles
          </Button>
          {apparel.is_active && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleArchive}
              className="text-destructive"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

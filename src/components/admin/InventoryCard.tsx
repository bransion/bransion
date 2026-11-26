'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import { Archive, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { archivePlainApparel } from '@/app/actions/admin-inventory';
import { adminUnarchivePlainApparel } from '@/app/actions/admin-inventory-v2';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
  apparel: any;
  onManage: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function InventoryCard({ apparel, onManage, onEdit, onDelete }: Props) {
  const router = useRouter();

  async function handleArchive() {
    if (
      !confirm(
        'Archive this apparel? It will no longer be available to creators in Create Product.'
      )
    ) {
      return;
    }
    const res = await archivePlainApparel(apparel.id);
    if (res.ok) {
      toast.success('Archived');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleUnarchive() {
    const res = await adminUnarchivePlainApparel(apparel.id);
    if (res.ok) {
      toast.success('Unarchived — visible in Create Product again');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  const styleCount = apparel.sub_children_styles?.[0]?.count ?? 0;

  return (
    <Card className={!apparel.is_active ? 'opacity-70 border-amber-500/40' : ''}>
      <CardContent className="p-4 space-y-4">
        <div className="aspect-square rounded-md overflow-hidden bg-muted relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={apparel.main_image_url}
            alt={apparel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur text-xs font-semibold px-2 py-1 rounded capitalize">
            {apparel.category.replace('-', ' ')}
          </div>
          {!apparel.is_active && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded">
              Archived
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold truncate">{apparel.name}</h3>
          <p className="text-sm text-muted-foreground">
            {formatNaira(apparel.default_base_cost)} base
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {styleCount} style{styleCount === 1 ? '' : 's'} attached
          </p>
        </div>

        <div className="space-y-2">
          <Button className="w-full" variant="outline" onClick={onManage}>
            Manage Styles
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>

          {apparel.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchive}
              className="w-full text-muted-foreground"
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnarchive}
              className="w-full text-muted-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Unarchive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
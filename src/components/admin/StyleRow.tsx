'use client';

import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import { archiveSubStyle } from '@/app/actions/admin-inventory';
import { adminUnarchiveSubStyle } from '@/app/actions/admin-inventory-extras';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Archive, Pencil, RotateCcw } from 'lucide-react';
import type { SubChildrenStyle } from '../../../types';

interface Props {
  style: SubChildrenStyle;
  onEdit?: () => void;
  onToggled?: () => void;
}

export function StyleRow({ style, onEdit, onToggled }: Props) {
  const router = useRouter();

  async function handleArchive() {
    if (
      !confirm(
        'Archive this style? It will no longer be available to creators.'
      )
    ) {
      return;
    }
    const res = await archiveSubStyle(style.id);
    if (res.ok) {
      toast.success('Archived');
      router.refresh();
      onToggled?.();
    } else {
      toast.error(res.error);
    }
  }

  async function handleUnarchive() {
    const res = await adminUnarchiveSubStyle(style.id);
    if (res.ok) {
      toast.success('Unarchived');
      router.refresh();
      onToggled?.();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0 bg-background/50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={style.preview_image_url}
          alt={style.style_title}
          className="h-10 w-10 object-cover rounded border flex-shrink-0"
        />
        <div className="min-w-0">
          <div className="font-medium text-sm truncate flex items-center gap-2">
            <span className="truncate">{style.style_title}</span>
            {!style.is_active && (
              <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded px-1 py-0.5 flex-shrink-0">
                Archived
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            +{formatNaira(style.additional_cost_markup)} cost
          </div>
        </div>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8"
            aria-label="Edit style"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {style.is_active ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleArchive}
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            aria-label="Archive style"
          >
            <Archive className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUnarchive}
            className="h-8 w-8 text-muted-foreground"
            aria-label="Unarchive style"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
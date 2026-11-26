'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { InventoryCard } from '@/components/admin/InventoryCard';
import { PlainApparelForm } from '@/components/admin/PlainApparelForm';
import { SubStyleForm } from '@/components/admin/SubStyleForm';
import { StyleRow } from '@/components/admin/StyleRow';
import { EditPlainApparelDialog } from '@/components/admin/EditPlainApparelDialog';
import { EditSubStyleDialog } from '@/components/admin/EditSubStyleDialog';
import { DeleteApparelDialog } from '@/components/admin/DeleteApparelDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listSubStylesForApparel } from '@/app/actions/admin-inventory';

export function InventoryView({ initialApparels }: { initialApparels: any[] }) {
  const [addOpen, setAddOpen] = useState(false);

  const [manageApparel, setManageApparel] = useState<any>(null);
  const [styles, setStyles] = useState<any[]>([]);
  const [addStyleOpen, setAddStyleOpen] = useState(false);

  const [editingApparel, setEditingApparel] = useState<any>(null);
  const [deletingApparel, setDeletingApparel] = useState<any>(null);
  const [editingStyle, setEditingStyle] = useState<any>(null);

  async function handleManage(apparel: any) {
    setManageApparel(apparel);
    const s = await listSubStylesForApparel(apparel.id);
    setStyles(s);
  }

  async function reloadStyles() {
    if (!manageApparel) return;
    const s = await listSubStylesForApparel(manageApparel.id);
    setStyles(s);
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage base plain apparels and their print sub-styles.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Plain Apparel
        </Button>
      </div>

      {initialApparels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-40" />
          <h2 className="font-semibold">No plain apparel yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first one to start building your catalog.
          </p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            Add Plain Apparel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {initialApparels.map((a) => (
            <InventoryCard
              key={a.id}
              apparel={a}
              onManage={() => handleManage(a)}
              onEdit={() => setEditingApparel(a)}
              onDelete={() => setDeletingApparel(a)}
            />
          ))}
        </div>
      )}

      <PlainApparelForm open={addOpen} onOpenChange={setAddOpen} />

      {/* Manage Styles Modal */}
      <Dialog
        open={!!manageApparel}
        onOpenChange={(o) => !o && setManageApparel(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Styles for {manageApparel?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-md border bg-muted/20">
              {styles.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No styles yet.
                </p>
              ) : (
                styles.map((s) => (
                  <StyleRow
                    key={s.id}
                    style={s}
                    onEdit={() => setEditingStyle(s)}
                    onToggled={reloadStyles}
                  />
                ))
              )}
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setAddStyleOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Sub-Style
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {manageApparel && (
        <SubStyleForm
          apparelId={manageApparel.id}
          open={addStyleOpen}
          onOpenChange={(o) => {
            setAddStyleOpen(o);
            if (!o && manageApparel) reloadStyles();
          }}
        />
      )}

      {/* Edit Apparel Dialog */}
      {editingApparel && (
        <EditPlainApparelDialog
          apparel={editingApparel}
          open={!!editingApparel}
          onOpenChange={(o) => {
            if (!o) setEditingApparel(null);
          }}
        />
      )}

      {/* Delete Apparel Dialog */}
      {deletingApparel && (
        <DeleteApparelDialog
          apparel={deletingApparel}
          open={!!deletingApparel}
          onOpenChange={(o) => {
            if (!o) setDeletingApparel(null);
          }}
        />
      )}

      {/* Edit Sub-Style Dialog */}
      {editingStyle && (
        <EditSubStyleDialog
          style={editingStyle}
          open={!!editingStyle}
          onOpenChange={(o) => {
            if (!o) {
              setEditingStyle(null);
              if (manageApparel) reloadStyles();
            }
          }}
        />
      )}
    </div>
  );
}
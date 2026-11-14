// src/app/admin/inventory/page.tsx
import { listPlainApparels } from "@/app/actions/admin-inventory";
import { InventoryView } from "./InventoryView";

export default async function AdminInventoryPage() {
  const apparels = await listPlainApparels();
  return <InventoryView initialApparels={apparels} />;
}

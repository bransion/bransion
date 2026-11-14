import { connection } from "next/server";
import { listShippingRates } from "@/app/actions/admin-logistics";
import { LogisticsView } from "./LogisticsView";

export default async function AdminLogisticsPage() {
  await connection();
  const rates = await listShippingRates();
  return <LogisticsView initialRates={rates} />;
}

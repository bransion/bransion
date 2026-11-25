import { listGeoShippingRates } from '@/app/actions/admin-delivery-fees';
import { DeliveryFeesView } from './DeliveryFeesView';

export const metadata = { title: 'Delivery Fees — Bransion Admin' };

export default async function AdminDeliveryFeesPage() {
  const rates = await listGeoShippingRates();
  return <DeliveryFeesView rates={rates} />;
}
import { connection } from 'next/server';
import { serviceRoleClient } from '@/lib/supabase/server';
import { getRevenueBreakdown } from '@/app/actions/admin-finance';
import { FinancesView } from '@/components/admin/FinancesView';

export default async function AdminFinancesPage() {
  await connection(); // Fix for Next.js 16 Date.now() prerender restriction

  const admin = serviceRoleClient();
  const { data: withdrawals } = await admin
    .from('withdrawal_requests')
    .select('*, profiles!withdrawal_requests_creator_id_fkey(email)')
    .eq('status', 'pending')
    .order('created_at');
    
  const { data: commissions } = await admin
    .from('commissions_ledger')
    .select('*, referrer:profiles!commissions_ledger_referrer_id_fkey(email), referee:profiles!commissions_ledger_referee_id_fkey(email)')
    .order('created_at', { ascending: false })
    .limit(50);
    
  const { data: allUsers } = await admin
    .from('profiles')
    .select('id, email')
    .order('email');
  
  const revenue = await getRevenueBreakdown(new Date().toISOString().slice(0, 7)); // current month

  return (
    <FinancesView
      withdrawals={withdrawals || []}
      commissions={commissions || []}
      allUsers={allUsers || []}
      revenue={revenue}
    />
  );
}
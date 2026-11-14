'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { formatNaira } from '@/lib/utils';
import { format } from 'date-fns';
import { approveWithdrawal, rejectWithdrawal, getReferralTree } from '@/app/actions/admin-finance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

export function FinancesView({ withdrawals, commissions, allUsers, revenue }: any) {
  const router = useRouter();
  const [treeUserId, setTreeUserId] = useState('');
  const [tree, setTree] = useState<any>(null);
  const [loadingTree, setLoadingTree] = useState(false);

  async function handleApprove(id: string) {
    if (!confirm('Approve this withdrawal?')) return;
    const res = await approveWithdrawal(id);
    if (res.ok) { toast.success('Approved'); router.refresh(); }
    else toast.error(res.error);
  }

  async function handleReject(id: string) {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    const res = await rejectWithdrawal(id, reason);
    if (res.ok) { toast.success('Rejected'); router.refresh(); }
    else toast.error(res.error);
  }

  async function loadTree() {
    if (!treeUserId) return;
    setLoadingTree(true);
    const res = await getReferralTree(treeUserId);
    setTree(res);
    setLoadingTree(false);
  }

  function renderTree(node: any) {
    if (!node) return null;
    return (
      <div key={node.id} className="ml-4 border-l pl-4 py-2">
        <div className="text-sm font-medium">{node.email} <span className="text-xs text-muted-foreground ml-2">Split: {node.split || 'root'}</span></div>
        {node.children.map((c: any) => renderTree(c))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance & Governance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage withdrawals, view commissions, and track revenue.</p>
      </div>
      
      {/* ADDED flex flex-col TO FORCE VERTICAL STACKING */}
      <Tabs defaultValue="withdrawals" className="w-full flex flex-col gap-6">
        
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 max-w-2xl">
          <TabsTrigger value="withdrawals">Withdrawals ({withdrawals.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        {/* WITHDRAWALS TAB */}
        <TabsContent value="withdrawals" className="space-y-4 w-full">
          {withdrawals.length === 0 ? (
            <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground">No pending withdrawals.</div>
          ) : withdrawals.map((w: any) => (
            <div key={w.id} className="flex flex-col sm:flex-row sm:items-center justify-between border p-4 rounded-lg bg-card shadow-sm gap-4 w-full">
              <div>
                <div className="font-semibold">{w.profiles.email}</div>
                <div className="text-sm text-muted-foreground">{w.bank_name} · {w.account_number}</div>
                <div className="text-sm text-muted-foreground">{w.bank_full_name}</div>
              </div>
              <div className="sm:text-right flex flex-col sm:items-end gap-2">
                <div className="font-bold text-lg">{formatNaira(w.amount)}</div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button className="flex-1 sm:flex-none" size="sm" onClick={() => handleApprove(w.id)}>Approve</Button>
                  <Button className="flex-1 sm:flex-none" size="sm" variant="destructive" onClick={() => handleReject(w.id)}>Reject</Button>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* COMMISSIONS TAB */}
        <TabsContent value="commissions" className="w-full">
          <div className="border rounded-lg bg-card overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground text-left">
                  <tr><th className="py-3 px-4">Date</th><th className="py-3 px-4">Referrer</th><th className="py-3 px-4">Referee</th><th className="py-3 px-4 text-right">Commission</th></tr>
                </thead>
                <tbody>
                  {commissions.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3 px-4 whitespace-nowrap">{format(new Date(c.created_at), 'MMM d')}</td>
                      <td className="py-3 px-4 truncate max-w-[150px]">{c.referrer?.email}</td>
                      <td className="py-3 px-4 truncate max-w-[150px]">{c.referee?.email}</td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">+{formatNaira(c.commission_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* REFERRALS TAB */}
        <TabsContent value="referrals" className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row gap-2">
            <select className="border rounded-md h-10 px-3 text-sm flex-1 max-w-sm bg-background" value={treeUserId} onChange={e => setTreeUserId(e.target.value)}>
              <option value="">Select a user to view their network...</option>
              {allUsers.map((u: any) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
            <Button onClick={loadTree} disabled={loadingTree || !treeUserId}>
              {loadingTree ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />} Load Tree
            </Button>
          </div>
          <div className="border rounded-lg bg-card p-6 min-h-[200px] w-full">
            {tree ? renderTree(tree) : <p className="text-sm text-muted-foreground text-center py-10">Select a user to view their referral tree.</p>}
          </div>
        </TabsContent>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="w-full">
          <div className="border rounded-lg bg-card p-6 space-y-8 w-full">
            <h3 className="font-semibold text-lg">Revenue Breakdown (This Month)</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2"><span className="font-medium">Creator Net (70%)</span><span className="font-bold">{formatNaira(revenue.creatorNet)}</span></div>
                <div className="h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2"><span className="font-medium">Bransion Net (30% - Referrals)</span><span className="font-bold">{formatNaira(revenue.bransionNet)}</span></div>
                <div className="h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${(revenue.bransionNet / (revenue.totalMarkup || 1)) * 100}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2"><span className="font-medium text-muted-foreground">Referral Payouts</span><span className="font-medium text-muted-foreground">{formatNaira(revenue.referralPayouts)}</span></div>
                <div className="h-4 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${(revenue.referralPayouts / (revenue.totalMarkup || 1)) * 100}%` }} /></div>
              </div>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
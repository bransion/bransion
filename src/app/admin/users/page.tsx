import { serviceRoleClient } from '@/lib/supabase/server';
import { formatNaira } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { UserActionsMenu } from '@/components/admin/UserActionsMenu';
import { format } from 'date-fns';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const admin = serviceRoleClient();

  let query = admin
    .from('profiles')
    .select(
      `id, email, full_name, role, user_role, tier, account_tier,
       wallet_balance, created_at, brands(count)`
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (search && search.trim()) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: users } = await query;

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage platform accounts, override tiers, and control access.
        </p>
      </div>

      <form className="flex gap-2 max-w-md">
        <Input name="search" defaultValue={search ?? ''} placeholder="Search by email or name" />
        <button
          type="submit"
          className="rounded-md border px-4 text-sm hover:bg-muted"
        >
          Search
        </button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-4 text-left">User</th>
              <th className="py-3 px-4 text-left">Role</th>
              <th className="py-3 px-4 text-left">Tier</th>
              <th className="py-3 px-4 text-center">Brands</th>
              <th className="py-3 px-4 text-right">Wallet</th>
              <th className="py-3 px-4 text-left">Joined</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!users || users.length === 0) ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u: any) => {
                const displayTier = u.account_tier || u.tier || 'basic';
                const brandCount = u.brands?.[0]?.count ?? 0;

                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4">
                      <div className="font-medium truncate">
                        {u.full_name ?? '—'}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            : u.role === 'creator'
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full capitalize ${
                          displayTier === 'premium'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            : displayTier === 'standard'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                              : 'bg-muted text-muted-foreground'
                        }`}
                        title={`Current tier: ${displayTier}. Use the 3-dot menu to override.`}
                      >
                        {displayTier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{brandCount}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatNaira(Number(u.wallet_balance))}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(u.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end">
                        <UserActionsMenu
                          user={{
                            id: u.id,
                            email: u.email,
                            role: u.role,
                            account_tier: displayTier,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Viewing {users?.length ?? 0} user(s)
        {search ? ` matching "${search}"` : ''}.
      </p>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { TierOverrideDialog } from '@/components/admin/TierOverrideDialog';
import {
  searchUsersForAdmin,
  toggleUserRole,
} from '@/app/actions/admin-users-v3';

// Define the strict type instead of using 'any'
interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  account_tier: string | null;
  tier: string | null;
  role: string | null;
  user_role?: string | null;
  total_slots_used: number | null;
  created_at: string;
}

export function UsersView({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [tierModal, setTierModal] = useState<UserRow | null>(null);
  const [roleBusy, setRoleBusy] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchUsersForAdmin(query);
        setUsers(results as UserRow[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleToggleRole(user: UserRow) {
    if (
      !confirm(
        `Are you sure you want to toggle the admin role for ${user.email}?`
      )
    )
      return;
    setRoleBusy(user.id);
    const res = await toggleUserRole(user.id);
    setRoleBusy(null);
    if (res.ok) {
      toast.success('Role updated');
      const results = await searchUsersForAdmin(query);
      setUsers(results as UserRow[]);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Governance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage tiers, roles, and send direct messages.
        </p>
      </div>

      <div className="flex gap-2 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, name, or referral code..."
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-3 px-4 text-left">User</th>
              <th className="py-3 px-4 text-left">Tier</th>
              <th className="py-3 px-4 text-left">Role</th>
              <th className="py-3 px-4 text-center">Slots</th>
              <th className="py-3 px-4 text-left">Joined</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium truncate">
                      {u.full_name ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email}
                    </div>
                  </td>
                  <td className="py-3 px-4 capitalize">
                    <span className="bg-muted px-2 py-1 rounded text-xs font-medium">
                      {u.account_tier || u.tier || 'basic'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                        u.role === 'admin' || u.user_role === 'admin'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-blue-500/10 text-blue-700'
                      }`}
                    >
                      {u.user_role || u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {u.total_slots_used ?? 0}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {roleBusy === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setTierModal(u)}
                          className="cursor-pointer"
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" /> Override Tier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/admin/notifications?to=${u.id}`)
                          }
                          className="cursor-pointer"
                        >
                          <Mail className="mr-2 h-4 w-4" /> Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleToggleRole(u)}
                          className="cursor-pointer text-destructive"
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" /> Toggle Admin
                          Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tierModal && (
        <TierOverrideDialog
          userId={tierModal.id}
          userEmail={tierModal.email}
          currentTier={tierModal.account_tier || tierModal.tier || 'basic'}
          open={!!tierModal}
          onOpenChange={(o) => !o && setTierModal(null)}
        />
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Package,
  Wallet,
  Crown,
  ShieldCheck,
  ArrowLeft,
  Share2,
  ShoppingBag,
  Trash2,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { DeleteAccountDialog } from '@/components/shared/DeleteAccountDialog';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BASE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/brands', label: 'Brands', icon: Store },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/subscription', label: 'Subscription', icon: Crown },
  { href: '/referrals', label: 'Referrals', icon: Share2 },
];

// Mobile bottom nav — Store front and center
const MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/store', label: 'Store', icon: ShoppingBag },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/brands', label: 'Brands', icon: Store },
];

interface Props {
  user: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    role: string;
  };
}

export function DashboardNav({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === 'admin';
  const displayName = user.full_name ?? user.email;
  const initials = displayName.slice(0, 2).toUpperCase();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const navItems: NavItem[] = isAdmin
    ? [...BASE_NAV, { href: '/admin', label: 'Admin', icon: ShieldCheck }]
    : BASE_NAV;

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleSignOut() {
    try {
      await fetch('/auth/signout', { method: 'POST', redirect: 'manual' });
    } catch {
      // Ignore — force navigate anyway
    }
    window.location.href = '/sign-in';
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ───────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">BRANSION</span>
            <span className="text-[10px] uppercase text-muted-foreground border rounded px-1.5 py-0.5">
              Studio
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3 space-y-1">
          <Link
            href="/store"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Store
          </Link>

          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-8 w-8">
              {user.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={displayName} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium">{displayName}</div>
              <div className="truncate text-[10px] text-muted-foreground">
                {user.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Delete Account
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
        <Link href="/dashboard" className="text-base font-bold tracking-tight">
          BRANSION
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                {user.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={displayName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-medium truncate">
                  {user.full_name ?? 'Account'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push('/store')}
                className="cursor-pointer"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Store
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/subscription')}
                className="cursor-pointer"
              >
                <Crown className="mr-2 h-4 w-4" />
                Subscription
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/referrals')}
                className="cursor-pointer"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Refer & Earn
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() => router.push('/admin')}
                  className="cursor-pointer"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-card">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2 text-[10px]',
                active
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userEmail={user.email}
      />
    </>
  );
}
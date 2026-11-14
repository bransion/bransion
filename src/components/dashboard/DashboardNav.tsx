// =====================================================================
// BRANSION — Dashboard shell navigation.
// 'use client' — uses usePathname for active highlighting.
// Desktop sidebar + mobile top bar + mobile bottom nav.
// Admin link visible only to role='admin'.
// NOTE: no shadcn `asChild` — project's Button doesn't support it, so
// we wrap Links manually. Visually identical.
// =====================================================================
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Package,
  Wallet,
  Crown,
  ShieldCheck,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
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
  const isAdmin = user.role === 'admin';
  const displayName = user.full_name ?? user.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  const navItems: NavItem[] = isAdmin
    ? [...BASE_NAV, { href: '/admin', label: 'Admin', icon: ShieldCheck }]
    : BASE_NAV;

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">BRANSION</span>
            <span className="text-[10px] uppercase text-muted-foreground border rounded px-1.5 py-0.5">
              Studio
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
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

          <form action="/auth/signout" method="post" className="px-2">
            <button
              type="submit"
              className="text-[11px] text-muted-foreground hover:text-destructive"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ──────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          BRANSION
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Avatar className="h-8 w-8">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={displayName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────────── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-card">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-[10px]',
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
    </>
  );
}
// =====================================================================
// BRANSION — Admin sidebar & mobile navigation.
// Desktop uses full NAV. Mobile uses MOBILE_NAV (top 5).
// =====================================================================
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingBag,
  DollarSign,
  Truck,
  ArrowLeft,
  Home,
  Layers,
  Megaphone,
  Share2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/utils';

// ── DESKTOP NAV (Full List) ──────────────────────────────────────────
const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/catalog", label: "Catalog", icon: Layers },
  { href: "/admin/brands", label: "Brands", icon: Store },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/finances", label: "Finances", icon: DollarSign },
  { href: "/admin/fulfillment", label: "Fulfillment", icon: Truck },
  { href: "/admin/communications", label: "Communications", icon: Megaphone },
  { href: "/admin/referrals", label: "Referrals", icon: Share2 },
];

// ── MOBILE BOTTOM NAV (Top 5 Essential) ──────────────────────────────
const MOBILE_NAV = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/fulfillment', label: 'Synth', icon: Truck },
  { href: '/admin/finances', label: 'Finance', icon: DollarSign },
  { href: '/admin/users', label: 'Users', icon: Users },
];

interface Props {
  user: { full_name: string | null; email: string; avatar_url: string | null };
}

export function AdminNav({ user }: Props) {
  const pathname = usePathname();
  const displayName = user.full_name ?? user.email;
  const initials = displayName.slice(0, 2).toUpperCase();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ───────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">BRANSION</span>
            <span className="text-[10px] uppercase text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded px-1.5 py-0.5">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
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
            <Home className="h-3 w-3" />
            Back to Store
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Creator Dashboard
          </Link>

          <div className="flex items-center gap-2 px-2 py-2 mt-2">
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

      {/* ── MOBILE TOP BAR ────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight">BRANSION</span>
          <span className="text-[9px] uppercase text-amber-600 border border-amber-500/40 rounded px-1 py-0.5">
            Admin
          </span>
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

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-card pb-safe">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 w-full h-full text-[10px]',
                active
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
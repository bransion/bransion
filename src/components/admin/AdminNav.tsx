'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
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
  Trash2,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { DeleteAccountDialog } from '@/components/shared/DeleteAccountDialog';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// ── DESKTOP SIDEBAR — Full flat list ─────────────────────────────────
const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/catalog', label: 'Catalog', icon: Layers },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/brands', label: 'Brands', icon: Store },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/finances', label: 'Finances', icon: DollarSign },
  { href: '/admin/fulfillment', label: 'Fulfillment', icon: Truck },
  { href: '/admin/communications', label: 'Communications', icon: Megaphone },
  { href: '/admin/referrals', label: 'Referrals', icon: Share2 },
];

// ── MOBILE DRAWER — Grouped for clarity ──────────────────────────────
const MOBILE_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Admin',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/catalog', label: 'Catalog', icon: Layers },
      { href: '/admin/inventory', label: 'Inventory', icon: Package },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/brands', label: 'Brands', icon: Store },
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/admin/finances', label: 'Finances', icon: DollarSign },
      { href: '/admin/fulfillment', label: 'Fulfillment', icon: Truck },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { href: '/admin/communications', label: 'Communications', icon: Megaphone },
      { href: '/admin/referrals', label: 'Referrals', icon: Share2 },
    ],
  },
];

interface Props {
  user: { full_name: string | null; email: string; avatar_url: string | null };
}

export function AdminNav({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const displayName = user.full_name ?? user.email;
  const initials = displayName.slice(0, 2).toUpperCase();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
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

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────────────────── */}
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

      {/* ── MOBILE TOP BAR ──────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight">BRANSION</span>
          <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded px-1 py-0.5">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── MOBILE DRAWER ───────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[85vw] max-w-sm p-0 flex flex-col"
        >
          <SheetHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">
                  BRANSION
                </span>
                <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded px-1 py-0.5">
                  Admin
                </span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeDrawer}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Store CTA — prominent, at top */}
            <div className="p-4 border-b">
              <Link
                href="/store"
                onClick={closeDrawer}
                className="flex items-center justify-between rounded-lg bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white dark:from-white dark:to-gray-300 dark:text-[#0B0B0F] px-4 py-3 text-sm font-semibold shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Browse Store
                </span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Grouped nav sections */}
            {MOBILE_GROUPS.map((group) => (
              <div key={group.title} className="border-b py-2 last:border-b-0">
                <div className="px-5 py-2 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                  {group.title}
                </div>
                <nav className="px-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeDrawer}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F]'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="h-3.5 w-3.5" />}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* Creator dashboard escape hatch */}
            <div className="border-b py-2">
              <div className="px-5 py-2 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Switch Mode
              </div>
              <nav className="px-2">
                <Link
                  href="/dashboard"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">Creator Dashboard</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Footer — user + actions */}
          <div className="border-t p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-3 px-1">
              <Avatar className="h-10 w-10">
                {user.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt={displayName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">{displayName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                closeDrawer();
                handleSignOut();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <button
              type="button"
              onClick={() => {
                closeDrawer();
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userEmail={user.email}
      />
    </>
  );
}
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Menu,
  X,
  Store,
  Truck,
  LayoutDashboard,
  Wallet,
  Share2,
  ShieldCheck,
  LogOut,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { DeleteAccountDialog } from '@/components/shared/DeleteAccountDialog';
import { NotificationBell } from './NotificationBell';
import { useCart, cartCount } from '@/lib/store/cart';

export interface HeaderUser {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface HeaderProps {
  user: HeaderUser | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const items = useCart((s) => s.items);
  const count = cartCount(items);

  const displayName = user?.full_name ?? user?.email ?? 'Account';
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    try {
      await fetch('/auth/signout', { method: 'POST', redirect: 'manual' });
    } catch {
      // Ignore — force navigate anyway
    }
    window.location.href = '/sign-in';
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* ── LEFT: Hamburger (mobile) + Logo ────────────────── */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/store" className="text-xl font-bold tracking-tight">
            BRANSION
          </Link>
        </div>

        {/* ── CENTER: Desktop nav ─────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link href="/store" className="hover:text-foreground transition-colors">
            Shop
          </Link>
          <Link href="/creators" className="hover:text-foreground transition-colors">
            Creators
          </Link>
          <Link href="/track" className="hover:text-foreground transition-colors">
            Track Order
          </Link>
        </nav>

        {/* ── RIGHT: Actions ──────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push('/brands/new')}
            className="hidden sm:inline-flex bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white hover:opacity-90 dark:from-white dark:to-gray-300 dark:text-[#0B0B0F]"
          >
            Create a Brand
          </Button>

          <NotificationBell />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCartOpen(true)}
            aria-label={`Cart (${count} items)`}
            className="relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-[#0B0B0F] text-white text-[10px] font-bold flex items-center justify-center px-1 dark:bg-white dark:text-[#0B0B0F]">
                {count}
              </span>
            )}
          </Button>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9">
                  {user.avatar_url && (
                    <AvatarImage src={user.avatar_url} alt={displayName} />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-medium truncate">
                    {user.full_name ?? 'Welcome'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => router.push('/dashboard')}
                  className="cursor-pointer"
                >
                  Dashboard
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push('/wallet')}
                  className="cursor-pointer"
                >
                  My Wallet
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push('/referrals')}
                  className="cursor-pointer"
                >
                  Refer & Earn
                </DropdownMenuItem>

                {user.role === 'admin' && (
                  <DropdownMenuItem
                    onClick={() => router.push('/admin')}
                    className="cursor-pointer"
                  >
                    Admin
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer"
                >
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
          )}
        </div>
      </div>

      {/* ── MOBILE DRAWER ─────────────────────────────────────── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-sm p-0 flex flex-col"
        >
          <SheetHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-bold tracking-tight">
                BRANSION
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Create a Brand CTA */}
            <div className="p-4 border-b">
              <Link
                href="/brands/new"
                onClick={closeMobileMenu}
                className="flex items-center justify-center rounded-lg bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white dark:from-white dark:to-gray-300 dark:text-[#0B0B0F] px-4 py-3 text-sm font-semibold shadow-sm"
              >
                Create a Brand
              </Link>
            </div>

            {/* Store navigation */}
            <div className="border-b py-2">
              <div className="px-5 py-2 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Shop
              </div>
              <nav className="px-2">
                <Link
                  href="/store"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <ShoppingBag className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">Shop</span>
                </Link>
                <Link
                  href="/creators"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Store className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">Creators</span>
                </Link>
                <Link
                  href="/track"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Truck className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">Track Order</span>
                </Link>
              </nav>
            </div>

            {/* If logged in — creator nav */}
            {user && (
              <div className="border-b py-2">
                <div className="px-5 py-2 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                  My Account
                </div>
                <nav className="px-2">
                  <Link
                    href="/dashboard"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">Dashboard</span>
                  </Link>
                  <Link
                    href="/wallet"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <Wallet className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">Wallet</span>
                  </Link>
                  <Link
                    href="/referrals"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    <Share2 className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">Refer & Earn</span>
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-muted"
                    >
                      <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">Admin Panel</span>
                    </Link>
                  )}
                </nav>
              </div>
            )}
          </div>

          {/* Footer — user info + sign out */}
          <div className="border-t p-3 space-y-2 bg-muted/30">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-1">
                  <Avatar className="h-10 w-10">
                    {user.avatar_url && (
                      <AvatarImage src={user.avatar_url} alt={displayName} />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {displayName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 px-1">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
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
                    closeMobileMenu();
                    setDeleteOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                onClick={closeMobileMenu}
                className="block rounded-md bg-[#0B0B0F] text-white dark:bg-white dark:text-[#0B0B0F] px-4 py-2.5 text-sm font-semibold text-center"
              >
                Sign in
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      {user && (
        <DeleteAccountDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          userEmail={user.email}
        />
      )}
    </header>
  );
}
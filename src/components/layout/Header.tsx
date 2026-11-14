// =====================================================================
// BRANSION — Top navigation bar.
// Cart button opens the CartDrawer; count comes from Zustand (live).
// All navigation via useRouter().push() (this project's shadcn Button
// does not support asChild).
// =====================================================================
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
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
import { ThemeToggle } from './ThemeToggle';
import { CartDrawer } from '@/components/storefront/CartDrawer';
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
  const items = useCart((s) => s.items);
  const count = cartCount(items);

  const displayName = user?.full_name ?? user?.email ?? 'Account';
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    try {
      await fetch('/auth/signout', { method: 'POST', redirect: 'manual' });
    } catch {
      // Ignore — we force-navigate regardless.
    }
    window.location.href = '/sign-in';
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* ── Logo ────────────────────────────────────────────── */}
        <Link
          href="/store"
          className="font-heading text-xl font-extrabold tracking-[-0.03em]"
        >
          BRANSION
        </Link>

        {/* ── Center nav ───────────────────────────────────────── */}
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

        {/* ── Right cluster ─────────────────────────────────────── */}
        <div className="flex items-center gap-2">
                    {/* Per PROMPT PART 7: 135° obsidian gradient.
              Light mode → obsidian→#2A2A3A. Dark mode → white→gray for visibility. */}
          <Button
            size="sm"
            onClick={() => router.push('/brands/new')}
            className="hidden sm:inline-flex bg-gradient-to-br from-[#0B0B0F] to-[#2A2A3A] text-white hover:opacity-90 dark:from-white dark:to-gray-300 dark:text-[#0B0B0F]"
          >
            Create a Brand
          </Button>

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

          <NotificationBell />
          <ThemeToggle />
          

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Account menu"
              >
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
                  Refer &amp; Earn
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
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
// =====================================================================
// BRANSION — Global 404 page.
// Server component. Middleware lets this render for both logged-in
// and logged-out users (it's a static file, not a protected route).
// =====================================================================
import Link from 'next/link';
import { Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-7xl font-bold tracking-tighter text-foreground/20">
          404
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist, was moved, or is
            not public.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto">
              <Home className="mr-2 h-4 w-4" />
              Go to dashboard
            </Button>
          </Link>
          <Link href="/store">
            <Button variant="outline" className="w-full sm:w-auto">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse the store
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground pt-4">
          If you followed a link to get here, message us on WhatsApp and
          we&apos;ll fix it.
        </p>
      </div>
    </div>
  );
}
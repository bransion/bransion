// =====================================================================
// BRANSION — Footer. Static, appears on all store pages.
// Year hardcoded to avoid Date.now() during prerender under Next 16
// Cache Components. Update yearly (see comment).
// =====================================================================
import Link from 'next/link';

// ⚠️ Update this manually each January. Simple, safe, no prerender issues.
const COPYRIGHT_YEAR = 2026;

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg font-bold tracking-tight mb-2">BRANSION</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Print-on-demand commerce, built for Nigerian creators.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/store" className="hover:text-foreground">Browse</Link></li>
              <li><Link href="/creators" className="hover:text-foreground">Creators</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Creators</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/brands/new" className="hover:text-foreground">Start a Brand</Link></li>
              <li><Link href="/subscription" className="hover:text-foreground">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT || '').replace(/\D/g, '')}?text=${encodeURIComponent('Hi Bransion! I need help with: ')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  WhatsApp us
                </a>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
          <span>© {COPYRIGHT_YEAR} Bransion. All rights reserved.</span>
          <span>Made in Nigeria 🇳🇬</span>
        </div>
      </div>
    </footer>
  );
}
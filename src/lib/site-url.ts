// =====================================================================
// BRANSION — Resolves the correct site URL for the current environment.
//
// Priority:
//  1. NEXT_PUBLIC_SITE_URL (if set and NOT localhost)
//  2. VERCEL_PROJECT_PRODUCTION_URL (production domain on Vercel)
//  3. VERCEL_URL (preview deployment URL on Vercel)
//  4. http://localhost:3000 (local dev)
// =====================================================================
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && !explicit.includes('localhost') && !explicit.includes('127.0.0.1')) {
    return explicit.replace(/\/+$/, '');
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) {
    return `https://${vercelProd}`.replace(/\/+$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`.replace(/\/+$/, '');
  }

  if (explicit) return explicit.replace(/\/+$/, '');
  return 'http://localhost:3000';
}
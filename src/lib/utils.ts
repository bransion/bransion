// =====================================================================
// BRANSION — Shared utility helpers.
// cn() is required by every shadcn component (shadcn created this file
// with cn() only — we keep cn() and add two more helpers).
// =====================================================================
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class names without conflicts. Used by all shadcn components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Nigerian Naira, e.g. 15000 → "₦15,000". */
export function formatNaira(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safe);
}

/** Turn a free-form string into a URL-safe slug: "My Cool Brand!" → "my-cool-brand". */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
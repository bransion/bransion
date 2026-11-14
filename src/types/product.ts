// =====================================================================
// BRANSION — Derived (joined) types for the storefront.
// Distinct from `types/index.ts` at root (which mirrors DB rows).
// =====================================================================
import type { Product, Brand, PlainApparel, SizePricing } from '../../types';

export interface ProductWithRelations extends Product {
  brands: Pick<Brand, 'name' | 'slug' | 'logo_url'> | null;
  plain_apparel:
    | (PlainApparel & { size_pricing: SizePricing[] })
    | null;
}
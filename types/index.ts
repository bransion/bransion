// =====================================================================
// BRANSION — TypeScript types mirroring the database schema.
// =====================================================================

// ---------- ENUMS ----------
export type UserRole = 'buyer' | 'creator' | 'admin';

export type SubscriptionTier = 'none' | 'basic' | 'standard' | 'premium';

export type ApparelType = 'tshirt' | 'hoodie' | 'cap' | 'mug' | 'other';

export type ApparelSize =
  | '2XS' | 'XS' | 'S' | 'M' | 'L' | 'XL'
  | '2XL' | '3XL' | '4XL' | '5XL' | '6XL' | '7XL' | '8XL' | '9XL' | '10XL';

export type ProductStatus = 'draft' | 'live' | 'archived';

export type OrderStatus =
  | 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';

export type WalletTransactionType =
  | 'sale_credit' | 'withdrawal' | 'maintenance_fee' | 'adjustment';

export type MaintenanceInvoiceStatus = 'unpaid' | 'paid' | 'waived';

export type MaintenancePaidVia = 'wallet_auto' | 'manual';

export type WithdrawalStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export type SubscriptionPaymentStatus = 'pending' | 'paid' | 'failed';

// ---------- V3 ENUMS ----------
export type ApparelCategory = 't-shirt' | 'hoodie' | 'sweatshirt' | 'polo' | 'cap' | 'trouser' | 'jacket';
export type ProductStatusV3 = 'pending_review' | 'published' | 'rejected';

// ---------- ROW TYPES ----------

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  tier: SubscriptionTier;
  tier_paid_at: string | null;
  wallet_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  logo_url: string | null;
  is_active: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlainApparel {
  id: string;
  name: string;
  type: ApparelType;
  color_name: string | null;
  color_hex: string | null;
  image_url: string | null;
  base_medium_price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SizePricing {
  id: string;
  apparel_id: string;
  size: ApparelSize;
  price: number;
  created_at: string;
  updated_at: string;
}

// ---------- V3 NEW TABLES ----------
export interface BasePlainApparel {
  id: string;
  name: string;
  category: ApparelCategory;
  description: string;
  main_image_url: string;
  default_base_cost: number;
  size_price_modifiers: Record<string, number>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubChildrenStyle {
  id: string;
  plain_apparel_id: string;
  style_title: string;
  style_description: string | null;
  preview_image_url: string;
  additional_cost_markup: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// ---------- UPGRADED PRODUCT ----------
export interface Product {
  id: string;
  brand_id: string;
  apparel_id: string;
  name: string;
  description: string | null;
  design_url: string;
  creator_markup: number;
  slug: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;

  // V1/V2 fields (kept for backwards compatibility)
  legacy_status?: ProductStatus; 
  review_status?: string;
  raw_asset_url?: string | null;
  final_image_url?: string | null;
  style_config?: Record<string, unknown>;
  style_cost_modifier?: number;
  reviewed_by?: string | null;
  reviewed_at?: string | null;

  // V3 fields
  status: ProductStatusV3;
  plain_apparel_id?: string | null;
  selected_style_id?: string | null;
  selected_size?: string | null;
  base_cost_calculated?: number | null;
  user_profit_markup?: number | null;
  total_retail_price?: number | null;
  bransion_commission_fee?: number | null;
  creator_net_payout?: number | null;
  raw_creator_artwork_url?: string | null;
  final_composite_product_url?: string | null;
  rejection_reason?: string | null;
  published_by?: string | null;
  image_locked?: boolean;
}

export interface GeoShippingRate {
  id: string;
  state: string;
  lga: string;
  fee: number;
  is_active: boolean;
}

export interface Order {
  id: string;
  buyer_id: string;
  brand_id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  payment_reference: string | null;
  paid_at: string | null;
  shipping_full_name: string;
  shipping_primary_phone: string;
  shipping_secondary_phone: string | null;
  shipping_current_address: string;
  shipping_address: string;
  shipping_state: string;
  shipping_lga: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  size: string;
  size_price: number;
  markup: number;
  quantity: number;
  line_total: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  creator_id: string;
  order_id: string | null;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceInvoice {
  id: string;
  creator_id: string;
  tier: Exclude<SubscriptionTier, 'none'>;
  amount: number;
  billing_month: string;
  status: MaintenanceInvoiceStatus;
  paid_at: string | null;
  paid_via: MaintenancePaidVia | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  creator_id: string;
  amount: number;
  bank_full_name: string;
  account_number: string;
  bank_name: string;
  phone: string;
  status: WithdrawalStatus;
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  creator_id: string;
  tier: Exclude<SubscriptionTier, 'none'>;
  amount: number;
  payment_reference: string;
  status: SubscriptionPaymentStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

// ---------- BUSINESS CONSTANTS ----------
export const TIER_PRICES: Record<Exclude<SubscriptionTier, 'none'>, number> = {
  basic: 5000,
  standard: 20000,
  premium: 50000,
};

export const TIER_MONTHLY_FEES: Record<Exclude<SubscriptionTier, 'none'>, number> = {
  basic: 1000,
  standard: 2000,
  premium: 3000,
};

export const TIER_BRAND_LIMITS: Record<Exclude<SubscriptionTier, 'none'>, number | null> = {
  basic: 1,
  standard: 5,
  premium: null,
};

export const ALL_SIZES: ApparelSize[] = [
  '2XS','XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL','8XL','9XL','10XL',
];


// ---------- V3 FULFILLMENT ----------
export interface FulfillmentProduct {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  raw_creator_artwork_url: string | null;
  final_composite_product_url: string | null;
  base_cost_calculated: number;
  user_profit_markup: number;
  total_retail_price: number;
  bransion_commission_fee: number;
  creator_net_payout: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  published_at: string | null;
  image_locked: boolean;
  creator_email: string | null;
  creator_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  apparel_name: string | null;
  apparel_category: string | null;
  apparel_description: string | null;
  apparel_image_url: string | null;
  style_title: string | null;
  style_description: string | null;
  style_preview_url: string | null;
  style_cost: number;
}
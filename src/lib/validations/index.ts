// =====================================================================
// BRANSION — Zod schemas for every form. Used by React Hook Form on the
// client AND by API route handlers on the server (double validation).
// Server NEVER trusts the client — always re-validates here.
// =====================================================================
import { z } from 'zod';

// ── BRAND ────────────────────────────────────────────────────────────
export const brandSchema = z.object({
  name: z
    .string()
    .min(2, 'Brand name is too short')
    .max(60, 'Brand name is too long'),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().max(500, 'Description is too long').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  logo_url: z.string().url('Logo must be a valid URL').optional().or(z.literal('')),
});
export type BrandInput = z.infer<typeof brandSchema>;

// ── PRODUCT ──────────────────────────────────────────────────────────
export const productSchema = z.object({
  brand_id: z.string().uuid('Invalid brand'),
  apparel_id: z.string().uuid('Invalid apparel'),
  name: z.string().min(2, 'Name is too short').max(80, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
  design_url: z.string().url('Design image is required'),
  creator_markup: z.coerce
    .number()
    .min(0, 'Markup cannot be negative')
    .max(1_000_000, 'Markup is too large'),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only'),
});
export type ProductInput = z.infer<typeof productSchema>;

// UPDATE variant: design_url is IMMUTABLE after publish (see schema trigger).
// Also brand_id and slug stay locked — only text/markup can change.
export const productUpdateSchema = productSchema
  .omit({ design_url: true, brand_id: true, slug: true })
  .partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ── CHECKOUT ─────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
] as const;
export type NigerianState = (typeof NIGERIAN_STATES)[number];

export const checkoutSchema = z.object({
  shipping_full_name: z.string().min(2, 'Full name is required').max(100),
  shipping_primary_phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid Nigerian phone number'),
  shipping_secondary_phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  shipping_current_address: z.string().min(5, 'Current address is required').max(200),
  shipping_address: z.string().min(5, 'Shipping address is required').max(200),
  shipping_state: z.enum(NIGERIAN_STATES, { message: 'Select a state' }),
  shipping_lga: z.string().min(2, 'LGA is required').max(80),
  notes: z.string().max(500, 'Notes are too long').optional().or(z.literal('')),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export { NIGERIAN_STATES };

// ── WITHDRAWAL ───────────────────────────────────────────────────────
export const withdrawalSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  bank_full_name: z.string().min(2, 'Full name is required').max(100),
  account_number: z.string().regex(/^[0-9]{10}$/, 'Account number must be exactly 10 digits'),
  bank_name: z.string().min(2, 'Bank name is required').max(80),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number'),
});
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;

// ── TIER (subscription purchase) ─────────────────────────────────────
export const tierSchema = z.object({
  tier: z.enum(['basic', 'standard', 'premium'], { message: 'Select a valid tier' }),
});
export type TierInput = z.infer<typeof tierSchema>;
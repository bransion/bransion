// =====================================================================
// BRANSION V3 — Zod Validation Schemas
// =====================================================================
import { z } from 'zod';

export const plainApparelSchema = z.object({
  name: z.string().min(2).max(100),
    category: z.enum([
    't-shirt','hoodie','sweatshirt','polo','cap','trouser','jacket',
    'shoes','sneakers','bag','shorts','tank-top','long-sleeve','joggers',
    'bucket-hat','beanie','socks','dress','skirt','suit',
  ]),
  description: z.string().min(10),
  main_image_url: z.string().url(),
  default_base_cost: z.coerce.number().positive(),
  size_price_modifiers: z.record(z.string(), z.number()),
});

export const subStyleSchema = z.object({
  plain_apparel_id: z.string().uuid(),
  style_title: z.string().min(2).max(100),
  style_description: z.string().optional(),
  preview_image_url: z.string().url(),
  additional_cost_markup: z.coerce.number().min(0),
});

export const productCreateV3Schema = z.object({
  brand_id: z.string().uuid(),
  plain_apparel_id: z.string().uuid(),
  selected_style_id: z.string().uuid(),
  selected_size: z.string().min(1),
  user_profit_markup: z.coerce.number().positive(),
  raw_creator_artwork_url: z.string().url(),
  title: z.string().min(2).max(100),
  description: z.string().min(10),
});

export const geoShippingSchema = z.object({
  state: z.string().min(2),
  lga: z.string().min(2),
  fee: z.coerce.number().min(0),
});

export const tierOverrideSchema = z.object({
  targetUserId: z.string().uuid(),
  newTier: z.enum(['basic', 'standard', 'premium']),
  justification: z.string().min(10, 'Please provide a detailed justification'),
});

export const targetedNotificationSchema = z.object({
  recipient_id: z.string().uuid().nullable(),
  title: z.string().min(2),
  message: z.string().min(2),
  notification_type: z.enum([
    'general','tier_broadcast','targeted_admin','order_update',
    'payout_alert','product_published','product_rejected',
  ]),
});
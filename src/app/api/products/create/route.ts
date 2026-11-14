// =====================================================================
// BRANSION — Product creation API (review flow).
// Products enter status='draft' + review_status='pending_review'.
// Store queries filter .eq('status','live') so pending products are hidden.
// =====================================================================
import { NextResponse } from 'next/server';
import { serviceRoleClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth-helpers';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const inputSchema = z.object({
  brand_id: z.string().uuid('Invalid brand'),
  apparel_id: z.string().uuid('Invalid apparel'),
  style_id: z.string().min(2).max(50).optional(), // style_markups.code
  name: z.string().min(2, 'Name too short').max(80, 'Name too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long'),
  design_url: z.string().url('Design file is required'),
  creator_markup: z.coerce
    .number()
    .min(0, 'Markup cannot be negative')
    .max(1_000_000, 'Markup too large'),
});

async function generateUniqueSlug(
  admin: ReturnType<typeof serviceRoleClient>,
  base: string
): Promise<string> {
  const root = slugify(base) || 'product';
  let slug = root;
  for (let i = 0; i < 10; i++) {
    const { data } = await admin
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { user } = session;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid product details',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const admin = serviceRoleClient();

    // Brand ownership + active check
    const { data: brand } = await admin
      .from('brands')
      .select('id, creator_id, is_active')
      .eq('id', data.brand_id)
      .maybeSingle();

    if (!brand || brand.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Brand not found or not yours' },
        { status: 400 }
      );
    }
    if (!brand.is_active) {
      return NextResponse.json(
        { error: 'Brand is pending — complete tier payment first' },
        { status: 400 }
      );
    }

    // Tier check (admin bypass)
    const { data: profile } = await admin
      .from('profiles')
      .select('tier, account_tier, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      // Use account_tier if populated, fall back to legacy tier for safety
      const tier = profile?.account_tier ?? profile?.tier ?? 'none';
      if (tier === 'none') {
        return NextResponse.json(
          { error: 'Purchase a tier to publish products' },
          { status: 400 }
        );
      }
    }

    // Apparel
    const { data: apparel } = await admin
      .from('plain_apparel')
      .select('id, is_active, base_medium_price')
      .eq('id', data.apparel_id)
      .maybeSingle();

    if (!apparel || !apparel.is_active) {
      return NextResponse.json(
        { error: 'Apparel not available' },
        { status: 400 }
      );
    }

    // ── Style lookup (server-side — NEVER trust client-provided modifier) ──
    let styleCostModifier = 0;
    let styleConfig: Record<string, unknown> = {};
    let styleName: string | null = null;

    if (data.style_id) {
      const { data: style } = await admin
        .from('style_markups')
        .select('code, name, cost_modifier')
        .eq('code', data.style_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!style) {
        return NextResponse.json(
          { error: 'Invalid or inactive print style' },
          { status: 400 }
        );
      }
      styleCostModifier = Number(style.cost_modifier);
      styleName = style.name;
      styleConfig = {
        styleId: style.code,
        styleName: style.name,
        hasBackPrint: style.code === 'STYLE_B' || style.code === 'STYLE_C',
        positionX: 0,
        positionY: 0,
        scale: 1,
      };
    }

    // Insert as pending_review (status='draft' satisfies legacy CHECK constraint)
    const slug = await generateUniqueSlug(admin, data.name);

    const { data: inserted, error: insertErr } = await admin
      .from('products')
      .insert({
        brand_id: data.brand_id,
        apparel_id: data.apparel_id,
        name: data.name,
        description: data.description,
        // design_url is NOT NULL in schema — use raw asset as placeholder.
        // Admin will overwrite with final composited image on approval.
        design_url: data.design_url,
        raw_asset_url: data.design_url,
        final_image_url: null,
        style_config: styleConfig,
        style_cost_modifier: styleCostModifier,
        creator_markup: data.creator_markup,
        status: 'draft', // legacy column — required for CHECK constraint
        review_status: 'pending_review', // new column — drives admin queue
        slug,
        published_at: null,
      })
      .select('id, slug')
      .single();

    if (insertErr || !inserted) {
      console.error('Product insert error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product_id: inserted.id,
      slug: inserted.slug,
      published: false,
      review_status: 'pending_review',
      style_applied: styleName,
    });
  } catch (err) {
    console.error('Product create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Product creation failed' },
      { status: 500 }
    );
  }
}
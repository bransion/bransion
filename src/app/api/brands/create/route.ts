// =====================================================================
// BRANSION — Brand creation API.
// SECURITY:
//   • getSessionUser() for 401.
//   • Zod validates fields.
//   • logo_url (if present) MUST be a URL from OUR Supabase Storage —
//     prevents injection of data:/javascript:/arbitrary external URLs.
//   • Tier limits enforced server-side.
//   • Service-role used because RLS blocks tier='none' inserts.
// =====================================================================
import { NextResponse } from 'next/server';
import { serviceRoleClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth-helpers';
import { requireServerEnv } from '@/lib/env';
import { brandSchema } from '@/lib/validations';
import { slugify } from '@/lib/utils';
import { z } from 'zod';

const inputSchema = brandSchema.omit({ slug: true }).extend({
  logo_url: z.string().optional().or(z.literal('')),
});

function getLimit(tier: string): number {
  if (tier === 'premium') return Number.MAX_SAFE_INTEGER;
  if (tier === 'standard') return 5;
  if (tier === 'basic') return 1;
  return 1;
}

async function generateUniqueSlug(
  admin: ReturnType<typeof serviceRoleClient>,
  base: string
): Promise<string> {
  const root = slugify(base) || 'brand';
  let slug = root;
  for (let i = 0; i < 10; i++) {
    const { data } = await admin
      .from('brands')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Validate that logo_url (if present) is a public URL from our own
 * Supabase Storage `designs` bucket. Returns null if invalid.
 */
function validateLogoUrl(raw: string | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  const env = requireServerEnv();
  const expectedPrefix = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/designs/`;
  if (!raw.startsWith(expectedPrefix)) return null;
  return raw;
}

export async function POST(req: Request) {
  // ── 1) AUTH ──────────────────────────────────────────────────────
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { user } = session;

  try {
    // ── 2) VALIDATE ──────────────────────────────────────────────
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid brand details',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // ── 3) VALIDATE logo_url ORIGIN ─────────────────────────────
    let logoUrl: string | null = null;
    if (data.logo_url && data.logo_url.trim() !== '') {
      logoUrl = validateLogoUrl(data.logo_url);
      if (!logoUrl) {
        return NextResponse.json(
          {
            error:
              'Logo must be uploaded through Bransion (unsupported URL).',
          },
          { status: 400 }
        );
      }
    }

    const admin = serviceRoleClient();

    // ── 4) TIER + SLOT LIMITS ───────────────────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = profile?.tier ?? 'none';

    const { count } = await admin
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id);
    const totalBrands = count ?? 0;

    const limit = getLimit(tier);
    if (totalBrands >= limit) {
      return NextResponse.json(
        {
          error:
            tier === 'none'
              ? 'Complete your first tier purchase to create more brands.'
              : `You've used all ${limit} brand slot${limit > 1 ? 's' : ''}. Upgrade your tier to add more.`,
        },
        { status: 400 }
      );
    }

    // ── 5) INSERT ──────────────────────────────────────────────
    const slug = await generateUniqueSlug(admin, data.name);
    const isPending = tier === 'none';

    const { data: inserted, error: insertErr } = await admin
      .from('brands')
      .insert({
        creator_id: user.id,
        name: data.name,
        slug,
        description: data.description || null,
        phone: data.phone || null,
        logo_url: logoUrl,
        is_active: !isPending,
        published_at: isPending ? null : new Date().toISOString(),
      })
      .select('id, slug')
      .single();

    if (insertErr || !inserted) {
      console.error('Brand insert error:', insertErr);
      return NextResponse.json(
        { error: 'Failed to create brand' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      brand_id: inserted.id,
      slug: inserted.slug,
      mode: isPending ? 'pending' : 'active',
      redirect_url: isPending
        ? `/subscription?pending_brand_id=${inserted.id}`
        : '/brands',
    });
  } catch (err) {
    console.error('Brand create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Brand creation failed' },
      { status: 500 }
    );
  }
}
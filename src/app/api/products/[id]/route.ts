// =====================================================================
// BRANSION — Product update + archive API.
// SECURITY:
//   • Uses getSessionUser() for 401.
//   • Zod validates body for both status changes and field updates.
//   • Ownership verified via brand join — cannot edit another creator's product.
//   • Design URL / brand / apparel / slug are never updatable.
//   • DB trigger `prevent_product_image_change` is the final guard.
// =====================================================================
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth-helpers';

const statusSchema = z.object({
  status: z.enum(['live', 'archived']),
});

const fieldUpdateSchema = z
  .object({
    name: z.string().min(2, 'Name too short').max(80, 'Name too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    creator_markup: z.coerce
      .number()
      .min(0, 'Markup cannot be negative')
      .max(1_000_000, 'Markup too large')
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'No fields to update',
  });

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  // ── 1) AUTH ──────────────────────────────────────────────────────
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const { user, supabase } = session;

  const { id } = await params;

  try {
    // ── 2) OWNERSHIP CHECK ─────────────────────────────────────
    type ProdWithBrand = {
      id: string;
      status: string;
      brands: { creator_id: string } | null;
    };
    const { data: rawExisting } = await supabase
      .from('products')
      .select('id, status, brands(creator_id)')
      .eq('id', id)
      .maybeSingle();

    const existing = rawExisting as unknown as ProdWithBrand | null;
    if (!existing || existing.brands?.creator_id !== user.id) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ── 3) PARSE BODY ──────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ── 4) STATUS CHANGE BRANCH ────────────────────────────────
    if ('status' in body && body.status !== undefined) {
      const parsed = statusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            issues: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      if (existing.status === 'draft') {
        return NextResponse.json(
          { error: 'Draft products cannot be archived. Publish first.' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('products')
        .update({ status: parsed.data.status })
        .eq('id', id);

      if (error) {
        console.error('Status update error:', error);
        return NextResponse.json(
          { error: 'Failed to update status' },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, status: parsed.data.status });
    }

    // ── 5) FIELD UPDATE BRANCH ─────────────────────────────────
    const parsed = fieldUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid fields',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Explicit allowlist — never design_url, brand_id, slug, apparel_id.
    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.creator_markup !== undefined)
      updates.creator_markup = parsed.data.creator_markup;

    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Product update error:', error);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Product update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}
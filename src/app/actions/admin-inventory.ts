// =====================================================================
// BRANSION V3 — Admin Inventory Server Actions
// =====================================================================
'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { plainApparelSchema, subStyleSchema } from '@/lib/validations/v3';

// ── Plain Apparel ─────────────────────────────────────────────────────
export async function listPlainApparels() {
  const { admin } = await assertAdmin();
  const { data } = await admin
    .from('base_plain_apparel')
    .select('*, sub_children_styles(count)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createPlainApparel(formData: FormData) {
  try {
    const { userId, admin } = await assertAdmin();

    const rawData = {
      name: formData.get('name'),
      category: formData.get('category'),
      description: formData.get('description'),
      default_base_cost: Number(formData.get('default_base_cost')),
      main_image_url: formData.get('main_image_url'),
      size_price_modifiers: JSON.parse(formData.get('size_price_modifiers') as string),
    };

    const parsed = plainApparelSchema.safeParse(rawData);
    if (!parsed.success) {
  const firstError =
    Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .filter((v): v is string => typeof v === 'string')[0] ?? 'Invalid input';
  throw new Error(firstError);
}

    const { data, error } = await admin
      .from('base_plain_apparel')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_published', // Using existing enum
      target_table: 'base_plain_apparel',
      target_id: data.id,
      new_state: parsed.data,
      justification: 'Created new base plain apparel',
    });

    revalidatePath('/admin/inventory');
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function archivePlainApparel(id: string) {
  try {
    const { userId, admin } = await assertAdmin();
    const { data: previous } = await admin.from('base_plain_apparel').select('*').eq('id', id).single();

    const { error } = await admin.from('base_plain_apparel').update({ is_active: false }).eq('id', id);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_deleted', // Using existing enum
      target_table: 'base_plain_apparel',
      target_id: id,
      previous_state: previous,
      new_state: { is_active: false },
      justification: 'Archived plain apparel',
    });

    revalidatePath('/admin/inventory');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Sub Styles ────────────────────────────────────────────────────────
export async function listSubStylesForApparel(apparelId: string) {
  const { admin } = await assertAdmin();
  const { data } = await admin
    .from('sub_children_styles')
    .select('*')
    .eq('plain_apparel_id', apparelId)
    .order('display_order', { ascending: true });
  return data ?? [];
}

export async function createSubStyle(formData: FormData) {
  try {
    const { userId, admin } = await assertAdmin();

    const rawData = {
      plain_apparel_id: formData.get('plain_apparel_id'),
      style_title: formData.get('style_title'),
      style_description: formData.get('style_description') || null,
      preview_image_url: formData.get('preview_image_url'),
      additional_cost_markup: Number(formData.get('additional_cost_markup')),
    };

    const parsed = subStyleSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError =
        Object.values(parsed.error.flatten().fieldErrors)
          .flat()
          .filter((v): v is string => typeof v === "string")[0] ??
        "Invalid input";
      throw new Error(firstError);
    }

    const { data, error } = await admin
      .from('sub_children_styles')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_published',
      target_table: 'sub_children_styles',
      target_id: data.id,
      new_state: parsed.data,
      justification: 'Created new sub-style',
    });

    revalidatePath('/admin/inventory');
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

export async function archiveSubStyle(id: string) {
  try {
    const { userId, admin } = await assertAdmin();
    const { error } = await admin.from('sub_children_styles').update({ is_active: false }).eq('id', id);
    if (error) throw error;

    await admin.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'product_deleted',
      target_table: 'sub_children_styles',
      target_id: id,
      justification: 'Archived sub-style',
    });

    revalidatePath('/admin/inventory');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}

// ── Image Uploads ─────────────────────────────────────────────────────
export async function uploadApparelImage(formData: FormData) {
  const { admin } = await assertAdmin();
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from('plain-apparel').upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = admin.storage.from('plain-apparel').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadStylePreview(formData: FormData) {
  const { admin } = await assertAdmin();
  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from('style-previews').upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = admin.storage.from('style-previews').getPublicUrl(path);
  return data.publicUrl;
}
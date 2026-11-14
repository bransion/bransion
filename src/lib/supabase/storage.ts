// =====================================================================
// BRANSION V3 — Storage Helpers
// =====================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKETS = {
  brandAssets: "brand-assets",
  productImages: "product-images",
  stylePreviews: "style-previews",
  plainApparel: "plain-apparel",
} as const;

export async function uploadToBucket(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

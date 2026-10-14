import { supabase } from "./supabaseClient";

/**
 * Product images live in a private bucket, one folder per product, so every read
 * is a signed URL with an hour of life. Called from three components on every
 * mount, which is why there is a cache in front of it.
 *
 * Split out of api.ts when that file reached the 250-line limit. Storage is a
 * different concern from reading tables, so this is a seam the limit exposed
 * rather than one it invented.
 */

const BUCKET = "product-images";

const productImageCache = new Map<string, string | null | undefined>();

export async function uploadProductImage(
  storeId: string,
  productId: string,
  file: File
): Promise<string> {
  const path = `${storeId}/${productId}/${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  productImageCache.delete(`${storeId}/${productId}`);
  return path;
}

export async function deleteProductImage(storeId: string, productId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`${storeId}/${productId}`);
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${storeId}/${productId}/${f.name}`);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(error.message);
  productImageCache.delete(`${storeId}/${productId}`);
}

export async function getProductImageUrl(
  storeId: string,
  productId: string
): Promise<string | null> {
  const cacheKey = `${storeId}/${productId}`;
  const cached = productImageCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`${storeId}/${productId}`);
  if (!files || files.length === 0) {
    productImageCache.set(cacheKey, null);
    return null;
  }
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${storeId}/${productId}/${files[0].name}`, 3600);
  const url = data?.signedUrl ?? null;
  productImageCache.set(cacheKey, url);
  return url;
}

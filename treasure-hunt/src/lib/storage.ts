import { SIGNED_URL_TTL } from "@/lib/constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/** Create a signed URL for a private storage object (or null). */
export async function signedUrl(
  supabase: Client,
  bucket: string | null | undefined,
  path: string | null | undefined,
  ttl: number = SIGNED_URL_TTL,
): Promise<string | null> {
  if (!bucket || !path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  return data?.signedUrl ?? null;
}

/** Sign many storage paths in one round-trip per bucket. */
export async function signedUrlMap(
  supabase: Client,
  items: { bucket: string; path: string }[],
  ttl: number = SIGNED_URL_TTL,
): Promise<Map<string, string>> {
  const byBucket = new Map<string, string[]>();
  for (const { bucket, path } of items) {
    const list = byBucket.get(bucket) ?? [];
    if (!list.includes(path)) list.push(path);
    byBucket.set(bucket, list);
  }

  const result = new Map<string, string>();
  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, paths]) => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, ttl);
      data?.forEach((entry) => {
        if (entry.signedUrl && entry.path) {
          result.set(`${bucket}/${entry.path}`, entry.signedUrl);
        }
      });
    }),
  );
  return result;
}

export function storageKey(bucket: string, path: string) {
  return `${bucket}/${path}`;
}

import { createClient } from "@/lib/supabase/server";
import { signedUrlMap, storageKey } from "@/lib/storage";
import { MemoriesGrid } from "./memories-grid";

export const metadata = { title: "Memories" };

export default async function MemoriesPage() {
  const supabase = await createClient();

  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .order("position")
    .order("taken_on", { ascending: true });

  const urls = await signedUrlMap(
    supabase,
    (memories ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );

  const items = (memories ?? [])
    .map((m) => ({
      id: m.id,
      title: m.title,
      caption: m.caption,
      takenOn: m.taken_on,
      mediaType: m.media_type,
      url: urls.get(storageKey(m.bucket, m.path)) ?? "",
    }))
    .filter((m) => m.url);

  return <MemoriesGrid items={items} />;
}

import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap, storageKey } from "@/lib/storage";
import { TreasureEditor } from "./treasure-editor";

export const metadata = { title: "Final Treasure" };

export default async function AdminTreasurePage() {
  const supabase = await createClient();

  const [{ data: treasure }, { data: galleryRows }] = await Promise.all([
    supabase.from("treasure_settings").select("*").eq("id", true).maybeSingle(),
    supabase
      .from("media")
      .select("*")
      .eq("context", "treasure_gallery")
      .order("position")
      .order("created_at"),
  ]);

  const urls = await signedUrlMap(
    supabase,
    (galleryRows ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );

  const musicUrl = treasure
    ? await signedUrl(supabase, "media", treasure.music_path)
    : null;

  return (
    <TreasureEditor
      treasure={
        treasure ?? {
          id: true,
          title: "You Found It",
          message: "",
          letter: "",
          location_reveal: "",
          music_path: null,
          updated_at: new Date().toISOString(),
        }
      }
      gallery={(galleryRows ?? [])
        .map((m) => ({
          id: m.id,
          url: urls.get(storageKey(m.bucket, m.path)) ?? "",
          mediaType: m.media_type,
          caption: m.caption,
        }))
        .filter((m) => m.url)}
      musicUrl={musicUrl}
    />
  );
}

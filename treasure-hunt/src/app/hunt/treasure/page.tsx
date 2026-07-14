import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap, storageKey } from "@/lib/storage";
import { TreasureReveal } from "./treasure-reveal";

export default async function TreasurePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: complete } = await supabase.rpc("player_completed_all", {
    _player: user.id,
  });
  if (!complete) redirect("/hunt");

  // RLS also gates this behind completion — belt and braces.
  const { data: treasure } = await supabase
    .from("treasure_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (!treasure) redirect("/hunt");

  const { data: galleryRows } = await supabase
    .from("media")
    .select("*")
    .eq("context", "treasure_gallery")
    .order("position")
    .order("created_at");

  const urls = await signedUrlMap(
    supabase,
    (galleryRows ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );

  const gallery = (galleryRows ?? [])
    .map((m) => ({
      id: m.id,
      url: urls.get(storageKey(m.bucket, m.path)) ?? "",
      mediaType: m.media_type,
      caption: m.caption,
    }))
    .filter((m) => m.url);

  const musicUrl = await signedUrl(supabase, "media", treasure.music_path);

  return (
    <TreasureReveal
      title={treasure.title}
      message={treasure.message}
      letter={treasure.letter}
      locationReveal={treasure.location_reveal}
      gallery={gallery}
      musicUrl={musicUrl}
    />
  );
}

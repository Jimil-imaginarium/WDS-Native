import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap, storageKey } from "@/lib/storage";
import { RiddleEditor } from "./riddle-editor";

export const metadata = { title: "Edit Riddle" };

export default async function AdminRiddlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();

  const { data: riddle } = await supabase
    .from("riddles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!riddle) notFound();

  const [{ data: day }, { data: mediaRows }] = await Promise.all([
    supabase.from("days").select("*").eq("id", riddle.day_id).single(),
    supabase
      .from("media")
      .select("*")
      .eq("riddle_id", id)
      .eq("context", "riddle")
      .order("position")
      .order("created_at"),
  ]);

  const urls = await signedUrlMap(
    supabase,
    (mediaRows ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );

  const musicUrl = await signedUrl(supabase, "media", riddle.background_music_path);

  return (
    <RiddleEditor
      riddle={riddle}
      dayNumber={day?.day_number ?? 0}
      dayTitle={day?.title ?? ""}
      media={(mediaRows ?? [])
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

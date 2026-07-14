import { createClient } from "@/lib/supabase/server";
import { signedUrlMap, storageKey } from "@/lib/storage";
import { ExtrasBoard } from "./extras-board";

export const metadata = { title: "Extras" };

export default async function ExtrasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: memories },
    { data: timeline },
    { data: notes },
    { data: player },
    { data: riddles },
    { data: days },
  ] = await Promise.all([
    supabase.from("memories").select("*").order("position").order("taken_on"),
    supabase
      .from("timeline_events")
      .select("*")
      .order("event_date", { ascending: true }),
    supabase
      .from("secret_notes")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("role", "player").maybeSingle(),
    supabase.from("riddles").select("id, title, riddle_number, day_id"),
    supabase.from("days").select("id, day_number"),
  ]);

  const memoryUrls = await signedUrlMap(
    supabase,
    (memories ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );
  const timelineUrls = await signedUrlMap(
    supabase,
    (timeline ?? [])
      .filter((t) => t.image_path)
      .map((t) => ({ bucket: "media", path: t.image_path as string })),
  );

  const dayMap = new Map((days ?? []).map((d) => [d.id, d.day_number]));

  return (
    <ExtrasBoard
      currentUserId={user?.id ?? ""}
      player={
        player
          ? {
              id: player.id,
              displayName: player.display_name,
              welcomeMessage: player.welcome_message,
            }
          : null
      }
      memories={(memories ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        caption: m.caption,
        takenOn: m.taken_on,
        mediaType: m.media_type,
        url: memoryUrls.get(storageKey(m.bucket, m.path)) ?? "",
      }))}
      timeline={(timeline ?? []).map((t) => ({
        id: t.id,
        eventDate: t.event_date,
        title: t.title,
        description: t.description,
        imagePath: t.image_path,
        imageUrl: t.image_path
          ? (timelineUrls.get(storageKey("media", t.image_path)) ?? null)
          : null,
      }))}
      notes={(notes ?? []).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        createdAt: n.created_at,
        mine: n.author_id === user?.id,
        unlockRiddleId: n.unlock_riddle_id,
      }))}
      riddleOptions={(riddles ?? [])
        .map((r) => ({
          id: r.id,
          label: `Day ${dayMap.get(r.day_id) ?? "?"} · Riddle ${r.riddle_number} — ${r.title}`,
          sort: (dayMap.get(r.day_id) ?? 0) * 100 + r.riddle_number,
        }))
        .sort((a, b) => a.sort - b.sort)}
    />
  );
}

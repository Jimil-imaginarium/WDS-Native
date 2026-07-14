import { createClient } from "@/lib/supabase/server";
import { signedUrlMap, storageKey } from "@/lib/storage";
import { LoveTimeline } from "./love-timeline";

export const metadata = { title: "Our Story" };

export default async function TimelinePage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("timeline_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("position");

  const urls = await signedUrlMap(
    supabase,
    (events ?? [])
      .filter((e) => e.image_path)
      .map((e) => ({ bucket: "media", path: e.image_path as string })),
  );

  const items = (events ?? []).map((e) => ({
    id: e.id,
    date: e.event_date,
    title: e.title,
    description: e.description,
    imageUrl: e.image_path
      ? (urls.get(storageKey("media", e.image_path)) ?? null)
      : null,
  }));

  return <LoveTimeline items={items} />;
}

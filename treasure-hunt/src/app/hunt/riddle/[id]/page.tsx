import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap, storageKey } from "@/lib/storage";
import type { GalleryItem } from "@/components/media-gallery";
import { RiddleExperience, type ProofView, type PunishmentView } from "./riddle-experience";

export default async function RiddlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contentRows } = await supabase.rpc("get_riddle_content", {
    _riddle: id,
  });
  const content = contentRows?.[0];
  if (!content) {
    // Locked, future or nonexistent — send her back to the map.
    redirect("/hunt");
  }

  const [
    { data: board },
    { data: progress },
    { data: submissions },
    { data: punishments },
    { data: mediaRows },
  ] = await Promise.all([
    supabase.rpc("get_player_board"),
    supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", user.id)
      .eq("riddle_id", id)
      .maybeSingle(),
    supabase
      .from("answer_submissions")
      .select("*")
      .eq("player_id", user.id)
      .eq("riddle_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("punishments")
      .select("*")
      .eq("player_id", user.id)
      .eq("riddle_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("media")
      .select("*")
      .eq("riddle_id", id)
      .eq("context", "riddle")
      .order("position")
      .order("created_at"),
  ]);

  // Sign all riddle media in one pass.
  const urlMap = await signedUrlMap(
    supabase,
    (mediaRows ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
  );
  const gallery: GalleryItem[] = (mediaRows ?? [])
    .map((m) => ({
      id: m.id,
      url: urlMap.get(storageKey(m.bucket, m.path)) ?? "",
      mediaType: m.media_type,
      caption: m.caption,
    }))
    .filter((m) => m.url);

  const musicUrl = await signedUrl(supabase, "media", content.background_music_path);

  // Active punishment (latest one that isn't completed) + its proofs & media.
  const activePunishment =
    (punishments ?? []).find((p) => p.status !== "completed") ??
    (punishments ?? [])[0] ??
    null;

  let punishmentView: PunishmentView | null = null;
  if (activePunishment) {
    const [{ data: proofs }, { data: punishmentMedia }] = await Promise.all([
      supabase
        .from("punishment_proofs")
        .select("*")
        .eq("punishment_id", activePunishment.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("media")
        .select("*")
        .eq("context", "punishment")
        .eq("ref_id", activePunishment.id)
        .order("position"),
    ]);

    const pmUrls = await signedUrlMap(
      supabase,
      (punishmentMedia ?? []).map((m) => ({ bucket: m.bucket, path: m.path })),
    );

    const proofViews: ProofView[] = await Promise.all(
      (proofs ?? []).map(async (p) => ({
        id: p.id,
        proofType: p.proof_type,
        contentText: p.content_text,
        mediaUrl: await signedUrl(supabase, p.media_bucket, p.media_path),
        status: p.status,
        adminFeedback: p.admin_feedback,
        createdAt: p.created_at,
      })),
    );

    punishmentView = {
      id: activePunishment.id,
      title: activePunishment.title,
      description: activePunishment.description,
      status: activePunishment.status,
      media: (punishmentMedia ?? [])
        .map((m) => ({
          id: m.id,
          url: pmUrls.get(storageKey(m.bucket, m.path)) ?? "",
          mediaType: m.media_type,
          caption: m.caption,
        }))
        .filter((m) => m.url),
      proofs: proofViews,
    };
  }

  const ordered = board ?? [];
  const idx = ordered.findIndex((b) => b.riddle_id === id);
  const next = idx >= 0 ? ordered[idx + 1] : undefined;

  return (
    <RiddleExperience
      content={content}
      status={progress?.status ?? "not_started"}
      attempts={progress?.attempts ?? 0}
      latestSubmission={submissions?.[0] ?? null}
      punishment={punishmentView}
      gallery={gallery}
      musicUrl={musicUrl}
      playerId={user.id}
      nextRiddle={
        next
          ? { id: next.riddle_id, title: next.title, unlockAt: next.unlock_at }
          : null
      }
      totalDone={ordered.filter((b) => b.status === "completed").length}
      totalCount={ordered.length}
    />
  );
}
